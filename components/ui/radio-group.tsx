import * as React from "react"

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({})

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        ref={ref}
        className={`grid gap-2 ${className}`}
        {...props}
        role="radiogroup"
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
    checked?: boolean
    onCheckedChange?: (value: string) => void
  }
>(({ className, value, checked: controlledChecked, onCheckedChange: controlledOnChange, ...props }, ref) => {
  const context = React.useContext(RadioGroupContext)
  
  const isChecked = controlledChecked !== undefined ? controlledChecked : context.value === value
  const handleChange = (val: string) => {
    controlledOnChange?.(val)
    context.onValueChange?.(val)
  }

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isChecked}
      className={`aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        isChecked ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
      } ${className}`}
      onClick={() => handleChange(value)}
      {...props}
    >
      {isChecked && (
        <span className="flex items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </span>
      )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
