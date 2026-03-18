import { useState, useCallback, useRef, useEffect } from "react";
import type {
  ChatMessage,
  PRContext,
  EnrichedPRContext,
  StreamEvent,
  BackgroundMessage,
  FocusedItem,
  SkillIndicator,
  PromptSuggestion,
} from "../../shared/types";
import { parsePromptSuggestions } from "../../shared/parsing";
import { extractDiffForFile, fetchFileContent } from "../../shared/context";

const MAX_SUGGESTIONS = 2;

interface UseChatStreamingOptions {
  prContext: PRContext | null;
  enrichedContext: EnrichedPRContext | null;
  focusedItems: FocusedItem[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  persistMessages: (msgs: ChatMessage[]) => void;
}

interface UseChatStreamingResult {
  isStreaming: boolean;
  activeSkills: SkillIndicator[];
  systemPrompt: string;
  followUpSuggestions: PromptSuggestion[] | null;
  setFollowUpSuggestions: (s: PromptSuggestion[] | null) => void;
  handleSend: (content: string) => Promise<void>;
  handleStop: () => void;
  streamError: string | null;
  setStreamError: (e: string | null) => void;
}

export function useChatStreaming({
  prContext,
  enrichedContext,
  focusedItems,
  messages,
  setMessages,
  persistMessages,
}: UseChatStreamingOptions): UseChatStreamingResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSkills, setActiveSkills] = useState<SkillIndicator[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<PromptSuggestion[] | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const portRef = useRef<chrome.runtime.Port | null>(null);
  const lastAssistantContentRef = useRef<string>("");

  useEffect(() => {
    return () => {
      portRef.current?.disconnect();
      portRef.current = null;
    };
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!prContext || isStreaming) return;

      setFollowUpSuggestions(null);
      lastAssistantContentRef.current = "";

      const userMessage: ChatMessage = { role: "user", content, timestamp: Date.now() };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      const newMessages = [...messages, userMessage, assistantMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setStreamError(null);

      let contextToSend: PRContext = { ...prContext };

      if (focusedItems.length > 0) {
        const diffs: string[] = [];
        const contents: string[] = [];
        const fileNames: string[] = [];

        const uniqueFiles = [...new Set(focusedItems.map((it) => it.file))];
        for (const file of uniqueFiles) {
          diffs.push(extractDiffForFile(prContext.diff, file));
          const fc = await fetchFileContent(
            prContext.owner,
            prContext.repo,
            prContext.headBranch,
            file,
          );
          if (fc) contents.push(`// ${file}\n${fc}`);
        }

        for (const item of focusedItems) {
          fileNames.push(item.file);
        }

        contextToSend = {
          ...prContext,
          diff: diffs.join("\n"),
          focusedFile: [...new Set(fileNames)].join(", "),
        };

        const itemsWithLines = focusedItems.filter(
          (it): it is FocusedItem & { lineRange: NonNullable<FocusedItem["lineRange"]> } =>
            !!it.lineRange,
        );
        if (itemsWithLines.length === 1) {
          contextToSend.focusedLineRange = itemsWithLines[0].lineRange;
        } else if (itemsWithLines.length > 1) {
          const lineContext = itemsWithLines
            .map(
              (it) =>
                `[${it.file} L${it.lineRange.startLine}-${it.lineRange.endLine}]:\n${it.lineRange.content}`,
            )
            .join("\n\n");
          contextToSend.focusedFileContent = [
            lineContext,
            ...(contents.length > 0 ? contents : []),
          ].join("\n\n");
        }

        if (itemsWithLines.length <= 1 && contents.length > 0) {
          contextToSend.focusedFileContent = contents.join("\n\n");
        }
      }

      let port: chrome.runtime.Port;
      try {
        port = chrome.runtime.connect({ name: "probe-chat" });
      } catch {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            role: "assistant" as const,
            content: "Extension was reloaded. Please refresh the page.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }
      portRef.current = port;

      port.onMessage.addListener((event: StreamEvent) => {
        if (event.type === "skills") {
          setActiveSkills(event.skills);
          return;
        }
        if (event.type === "system-prompt") {
          setSystemPrompt(event.content);
          return;
        }
        if (event.type === "chunk") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              const newContent = last.content + event.content;
              lastAssistantContentRef.current = newContent;
              updated[updated.length - 1] = { ...last, content: newContent };
            }
            return updated;
          });
        } else if (event.type === "done") {
          setIsStreaming(false);
          const fullContent = lastAssistantContentRef.current;
          const match = fullContent.match(/\n*%%SUGGESTIONS:(\[[\s\S]*?\])\s*$/);
          let cleanContent = fullContent;
          if (match) {
            try {
              const suggestions = parsePromptSuggestions(JSON.parse(match[1]));
              if (suggestions.length > 0)
                setFollowUpSuggestions(suggestions.slice(0, MAX_SUGGESTIONS));
            } catch {
              /* malformed JSON — skip */
            }
            cleanContent = fullContent.slice(0, fullContent.length - match[0].length).trimEnd();
          }
          lastAssistantContentRef.current = "";
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && match) {
              updated[updated.length - 1] = { ...last, content: cleanContent };
            }
            persistMessages(updated);
            return updated;
          });
          port.disconnect();
        } else if (event.type === "error") {
          setIsStreaming(false);
          setStreamError(event.message);
          setMessages((prev) => {
            const updated = prev.filter(
              (_, i) =>
                !(i === prev.length - 1 && prev[i].role === "assistant" && prev[i].content === ""),
            );
            persistMessages(updated);
            return updated;
          });
          port.disconnect();
        }
      });

      const payload: BackgroundMessage = {
        type: "chat",
        payload: {
          messages: [...messages, userMessage],
          context: contextToSend,
          enrichedContext: enrichedContext ?? undefined,
        },
      };
      port.postMessage(payload);
    },
    [prContext, isStreaming, messages, setMessages, persistMessages, focusedItems, enrichedContext],
  );

  const handleStop = useCallback(() => {
    portRef.current?.postMessage({ type: "stop" });
    portRef.current?.disconnect();
    setIsStreaming(false);
    setMessages((prev) => {
      persistMessages(prev);
      return prev;
    });
  }, [persistMessages, setMessages]);

  return {
    isStreaming,
    activeSkills,
    systemPrompt,
    followUpSuggestions,
    setFollowUpSuggestions,
    handleSend,
    handleStop,
    streamError,
    setStreamError,
  };
}
