"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react"; // Needed for autocomplete state
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { PasswordInput } from "./ui/password-input";
import { cn } from "@/lib/utils";
import {INDIAN_STATES} from "@/config/states"

// --- New Imports for Autocomplete ---
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// --- Static Data ---


// --- Internal Helper: Autocomplete Component ---
// We separate this to manage the 'open' state for each individual field
const AutocompleteInput = ({ options = [], value, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground"
            )}
          >
            {value
              ? options.find((option) => option.value === value)?.label || value
              : placeholder || "Select option..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${placeholder?.toLowerCase() || "..."}`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Search by label
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Reusable Form Builder Component
 *  * 
 * @example
 * // Usage 1: With config object
 * const formConfig = {
 *   schema: loginSchema, // Zod schema
 *   defaultValues: { email: '', password: '' },
 *   onSubmit: async (data) => { ... },
 *   fields: [
 *     { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email' },
 *     { name: 'password', label: 'Password', type: 'password' },
 *   ],
 *   submitButton: { text: 'Login', loadingText: 'Logging in...' }
 * };
 * <FormBuilder config={formConfig} />
 * 
 * // Usage 2: With direct props (for admin pages)
 * <FormBuilder
 *   fields={categoryFields}
 *   validationSchema={categorySchema}
 *   onSubmit={handleSubmit}
 *   submitLabel="Create"
 *   isSubmitting={submitting}
 *   defaultValues={editingCategory}
 *   onCancel={handleCancel}
 * />
 */
export function FormBuilder({
  config,
  fields: directFields,
  validationSchema,
  onSubmit: directOnSubmit,
  submitLabel,
  isSubmitting: externalIsSubmitting,
  defaultValues: directDefaultValues,
  onCancel,
  className: directClassName,
  error: directError,
  success: directSuccess,
}) {
  const {
    schema,
    defaultValues = {},
    onSubmit,
    fields = [],
    submitButton = { text: "Submit", loadingText: "Submitting..." },
    className = "",
    error = null,
    success = null,
  } = config || {
    schema: validationSchema,
    defaultValues: directDefaultValues || {},
    onSubmit: directOnSubmit,
    fields: directFields || [],
    submitButton: {
      text: submitLabel || "Submit",
      loadingText: `${submitLabel || "Submitting"}...`,
    },
    className: directClassName || "",
    error: directError,
    success: directSuccess,
  };

  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    values: defaultValues,
  });

  const { isSubmitting: formIsSubmitting } = form.formState;
  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : formIsSubmitting;

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      type = "text",
      placeholder = "",
      description = "",
      options = [],
      rows = 4,
      disabled = false,
      className: fieldClassName = "",
    } = field;

    const renderInput = (formField) => {
      // 1. Text Inputs
      if (["text", "email", "tel", "number", "url", "date", "datetime-local", "time"].includes(type)) {
        return (
          <Input
            type={type}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            {...formField}
          />
        );
      }

      // 2. Password
      if (type === "password") {
        return (
          <PasswordInput
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            {...formField}
          />
        );
      }

      // 3. File
      if (type === "file") {
        return (
          <Input
            type="file"
            multiple={field.multiple || false}
            accept={field.accept || "*"}
            disabled={disabled || isSubmitting}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              formField.onChange(field.multiple ? files : files[0]);
            }}
          />
        );
      }

      // 4. Textarea
      if (type === "textarea") {
        return (
          <Textarea
            placeholder={placeholder}
            rows={rows}
            disabled={disabled || isSubmitting}
            {...formField}
          />
        );
      }

      // 5. Select (Standard Native-like)
      if (type === "select") {
        const selectValue = formField.value ? formField.value.toString() : undefined;
        return (
          <Select
            onValueChange={(val) => {
              formField.onChange(val);
              if (field.onChange) field.onChange(val, form);
            }}
            value={selectValue}
            disabled={disabled || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      // 6. State Names (Special Autocomplete)
      if (type === "state_names") {
        // Format INDIAN_STATES into { label, value } options
        const stateOptions = INDIAN_STATES.map((state) => ({
          label: state,
          value: state,
        }));
        
        return (
          <AutocompleteInput
            options={stateOptions}
            value={formField.value}
            onChange={formField.onChange}
            placeholder={placeholder || "Select state"}
            disabled={disabled || isSubmitting}
          />
        );
      }

      // 7. Generic Autocomplete
      if (type === "autocomplete") {
        return (
          <AutocompleteInput
            options={options} // Expects [{label: 'X', value: 'y'}]
            value={formField.value}
            onChange={formField.onChange}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
          />
        );
      }

      // 8. Multi-Select (Native)
      if (type === "multiselect") {
        const selectedValues = formField.value || [];
        return (
          <div className="space-y-2">
            <select
              multiple
              value={selectedValues.map((v) => v.toString())}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (option) =>
                  Number(option.value) || option.value
                );
                formField.onChange(selected);
              }}
              disabled={disabled || isSubmitting}
              className="w-full min-h-[150px] border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Hold Ctrl/Cmd to select multiple items
            </p>
          </div>
        );
      }

      // 9. Radio Group
      if (type === "radio") {
        return (
          <RadioGroup
            onValueChange={formField.onChange}
            defaultValue={formField.value}
            disabled={disabled || isSubmitting}
            className="flex flex-col space-y-1"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <label
                  htmlFor={`${name}-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </RadioGroup>
        );
      }

      // 10. Checkbox
      if (type === "checkbox") {
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formField.value}
              onCheckedChange={formField.onChange}
              disabled={disabled || isSubmitting}
            />
            <label className="text-sm font-normal cursor-pointer">
              {placeholder || label}
            </label>
          </div>
        );
      }

      return null;
    };

    return (
      <FormField
        key={name}
        control={form.control}
        name={name}
        render={({ field: formField }) => (
          <FormItem className={fieldClassName}>
            <FormLabel>{label}</FormLabel>
            <FormControl>{renderInput(formField)}</FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className={className}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="mb-4 border-green-500 text-green-700 bg-green-50">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Render all fields */}
          {fields.map((field) => renderField(field))}

          {/* Submit Button */}
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={onCancel ? "flex-1" : "w-full"}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? submitButton.loadingText : submitButton.text}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default FormBuilder;