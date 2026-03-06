---
name: shadcn-ui
description: Shadcn UI component library - beautifully designed React components built with Radix UI and Tailwind CSS
---

# Shadcn-UI Skill

Expert assistance with shadcn/ui - a collection of beautifully-designed, accessible components built with TypeScript, Tailwind CSS, and Radix UI primitives. Supports Next.js, Vite, Remix, Astro, Laravel, and more.

## When to Use This Skill

This skill should be triggered when:
- Installing or configuring shadcn/ui in any supported framework
- Adding shadcn/ui components (Button, Dialog, Form, Table, etc.)
- Implementing forms with React Hook Form or TanStack Form
- Setting up dark mode with shadcn/ui theming
- Customizing component styles or design tokens
- Building data tables with sorting/filtering/pagination
- Working with overlays (dialogs, sheets, popovers, tooltips)
- Creating accessible navigation components
- Implementing toast notifications or alerts
- Using the shadcn CLI to add components
- Customizing components.json configuration
- Building charts or carousels with shadcn/ui
- Questions about shadcn/ui best practices or patterns

## Quick Reference

### Installation and CLI

```bash
# Initialize shadcn/ui in a project
npx shadcn@latest init

# Add specific components
npx shadcn@latest add button
npx shadcn@latest add dialog form input

# Add all components
npx shadcn@latest add
```

### Basic Button Component

```typescript
import { Button } from "@/components/ui/button"

export default function Example() {
  return (
    <div className="flex gap-2">
      <Button>Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

### Form with Validation

```typescript
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
})

export default function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

### Dialog Component

```typescript
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Example() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

### Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function Example() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: "Success",
          description: "Your changes have been saved.",
        })
      }}
    >
      Show Toast
    </Button>
  )
}
```

### Data Table with Sorting

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const invoices = [
  { id: "INV001", status: "Paid", amount: "$250.00" },
  { id: "INV002", status: "Pending", amount: "$150.00" },
]

export default function DataTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>{invoice.id}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell>{invoice.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Select Dropdown

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Example() {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### Dark Mode Setup (Next.js)

```typescript
// app/providers.tsx
"use client"

import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}

// Usage in component
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <Button onClick={() => setTheme("dark")}>Dark Mode</Button>
  )
}
```

### Card Component

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content</p>
      </CardContent>
    </Card>
  )
}
```

### Combobox (Searchable Select)

```typescript
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
]

export default function Combobox() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {value || "Select framework..."}
          <ChevronsUpDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup>
            {frameworks.map((framework) => (
              <CommandItem
                key={framework.value}
                onSelect={() => {
                  setValue(framework.value)
                  setOpen(false)
                }}
              >
                <Check className={value === framework.value ? "mr-2 h-4 w-4" : "mr-2 h-4 w-4 opacity-0"} />
                {framework.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

## Reference Files

This skill includes comprehensive documentation in `references/`:

### llms.md
Complete overview of shadcn/ui with links to all components and features. Covers:
- Core principles (Open Code, Composition, Distribution, Beautiful Defaults, AI-Ready)
- Installation guides for all supported frameworks (Next.js, Vite, Remix, Astro, Laravel, etc.)
- Complete component catalog organized by category
- Dark mode setup for different frameworks
- Forms integration (React Hook Form, TanStack Form)
- Advanced topics (monorepo, React 19, Tailwind v4, JavaScript usage)
- Registry system for publishing/distributing components
- MCP Server integration for AI assistants

### other.md
Additional documentation mirroring llms.md content with organized sections for:
- All component categories (Form & Input, Layout & Navigation, Overlays & Dialogs, etc.)
- Installation instructions by framework
- Dark mode configuration
- Registry schemas

Use `view references/llms.md` for quick access to component links and documentation structure.

## Working with This Skill

### For Beginners
1. Start by initializing shadcn/ui: `npx shadcn@latest init`
2. Add basic components like Button, Input, and Card to learn the patterns
3. Review the Quick Reference examples above for common use cases
4. Use `references/llms.md` to explore available components by category

### For Building Forms
1. Install form components: `npx shadcn@latest add form input`
2. Set up React Hook Form with Zod validation (see Form example above)
3. Use Field component for labels and error messages
4. Check the Forms section in references for advanced patterns

### For Complex Components
1. Check component categories in references (Data Table, Command, Combobox)
2. Install required dependencies (some components use external libraries)
3. Follow the component-specific documentation links
4. Customize using Tailwind classes and component props

### For Theming
1. Edit `components.json` to configure paths and styling
2. Use the Theming guide for customizing colors and design tokens
3. Set up dark mode using the framework-specific guide
4. Override CSS variables for fine-grained control

## Key Concepts

### Component Philosophy
- **Open Code**: Components are copied into your project, not installed as dependencies
- **Composition**: Components are built using Radix UI primitives for accessibility
- **Customization**: Full control over styling using Tailwind CSS
- **Copy-paste friendly**: Modify components directly in your codebase

### Installation Model
Unlike traditional libraries, shadcn/ui components are added to your project via CLI:
- Components live in your `components/ui` directory
- You have full ownership and can modify them
- No package.json dependency (except for Radix UI and utilities)
- Update components by re-running `add` command

### components.json
Central configuration file that controls:
- Component installation paths
- TypeScript/JavaScript preference
- Tailwind CSS configuration
- Style variants (default/new-york)
- CSS variable usage
- Import aliases

### Styling Approach
- Uses Tailwind CSS utility classes
- CSS variables for theming (light/dark mode)
- `cn()` utility for conditional classes
- Variants defined using `class-variance-authority`

### Accessibility
All components built on Radix UI primitives ensure:
- Keyboard navigation
- Screen reader support
- ARIA attributes
- Focus management

### Framework Support
Works with any React framework through appropriate setup:
- **Next.js**: App Router and Pages Router
- **Vite**: Standard React setup
- **Remix**: Requires specific configuration
- **Astro**: React integration
- **Laravel**: Via Inertia.js
- **Others**: Manual installation guide available

## Common Patterns

### Async Form Submission (Next.js Server Actions)
```typescript
"use server"
async function onSubmit(formData: FormData) {
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
  }
  // Process data
  return { success: true }
}
```

### Responsive Dialog/Sheet
Use Dialog for desktop, Sheet for mobile:
```typescript
import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Sheet, SheetContent } from "@/components/ui/sheet"

const isDesktop = useMediaQuery("(min-width: 768px)")

if (isDesktop) {
  return <Dialog>...</Dialog>
}
return <Sheet>...</Sheet>
```

### Controlled Components
```typescript
const [open, setOpen] = useState(false)
const [value, setValue] = useState("")

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

## Resources

### Official Documentation
- Main site: https://ui.shadcn.com
- Components: https://ui.shadcn.com/docs/components
- CLI: https://ui.shadcn.com/docs/cli
- Themes: https://ui.shadcn.com/themes

### Tools
- **v0 by Vercel**: AI-powered UI generation with shadcn/ui
- **Figma**: Design resources available
- **MCP Server**: AI assistant integration for Claude Code, Cursor, etc.

### Registry
Create and publish your own component collections:
- Set up private or public registries
- Share components across projects
- Use authentication for private registries

## Troubleshooting

### Import Errors
Ensure your `tsconfig.json` has the correct path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Styling Issues
1. Verify Tailwind CSS is configured with `tailwind.config.js`
2. Check that globals.css imports are present
3. Ensure `cn()` utility is in `lib/utils.ts`

### Component Not Found
Run `npx shadcn@latest add <component-name>` to install missing components

## Notes

- Components are framework-agnostic and work with any React setup
- Dark mode requires theme provider (next-themes or similar)
- Some components depend on external libraries (date-fns, recharts, etc.)
- The CLI handles dependency installation automatically
- Components can be customized without breaking updates
- Registry system allows publishing custom component collections
- MCP integration enables AI-powered component installation
