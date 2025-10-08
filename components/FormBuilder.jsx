"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2 } from "lucide-react";

/**
 * Reusable Form Builder Component
 * 
 * @example
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
 * 
 * <FormBuilder config={formConfig} />
 */
export function FormBuilder({ config }) {
  const {
    schema,
    defaultValues = {},
    onSubmit,
    fields = [],
    submitButton = { text: "Submit", loadingText: "Submitting..." },
    className = "",
    error = null,
    success = null,
  } = config;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { isSubmitting } = form.formState;

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
      options = [], // For select, radio, checkbox groups
      rows = 4, // For textarea
      disabled = false,
      className: fieldClassName = "",
    } = field;

    // Render the appropriate input component based on type
    const renderInput = (formField) => {
      // Text Input, Email, Password, Number, etc.
      if (["text", "email", "password", "tel", "number", "url", "date"].includes(type)) {
        return (
          <Input
            type={type}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            {...formField}
          />
        );
      }

      // Textarea
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

      // Select Dropdown
      if (type === "select") {
        return (
          <Select
            onValueChange={formField.onChange}
            defaultValue={formField.value}
            disabled={disabled || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      // Radio Group
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

      // Checkbox
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
            <FormControl>
              {renderInput(formField)}
            </FormControl>
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
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? submitButton.loadingText : submitButton.text}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default FormBuilder;
