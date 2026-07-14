import * as React from "react"
import { ChevronDown } from "lucide-react"

const Select = ({ children, value, onValueChange }: any) => {
  const [selectedValue, setSelectedValue] = React.useState(value)

  React.useEffect(() => {
    setSelectedValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedValue(val)
    onValueChange?.(val)
  }

  // Extract items from children
  const items: any[] = []
  const findItems = (nodes: any) => {
    React.Children.forEach(nodes, (child) => {
      if (!child) return
      if (child.type?.displayName === "SelectItem") {
        items.push({ value: child.props.value, label: child.props.children })
      } else if (child.props?.children) {
        findItems(child.props.children)
      }
    })
  }
  findItems(children)

  const trigger = React.Children.toArray(children).find(
    (c: any) => c.type?.displayName === "SelectTrigger"
  ) as any
  const placeholder = trigger?.props?.children?.props?.placeholder

  return (
    <div className="relative w-full">
      <select
        value={selectedValue || ""}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
      >
        <option value="" disabled>
          {placeholder || "Select..."}
        </option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <div className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ${trigger?.props?.className || ""}`}>
        <span className="truncate">
          {items.find((i) => i.value === selectedValue)?.label || placeholder || "Select..."}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>
    </div>
  )
}

const SelectTrigger = React.forwardRef<any, any>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={className} {...props}>{children}</div>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>
SelectValue.displayName = "SelectValue"

const SelectContent = ({ children }: any) => <>{children}</>
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<any, any>(({ className, children, value, ...props }, ref) => (
  <div ref={ref} {...props}>{children}</div>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
