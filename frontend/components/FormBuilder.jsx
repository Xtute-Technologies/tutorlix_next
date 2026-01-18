"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
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
import { PasswordInput } from "./ui/password-input";

/**
 * Reusable Form Builder Component
 * 
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
  // Direct props (alternative to config)
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
  // Support both patterns: config object OR direct props
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
      loadingText: `${submitLabel || "Submitting"}...` 
    },
    className: directClassName || "",
    error: directError,
    success: directSuccess,
  };

  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    values: defaultValues, // Use 'values' for dynamic data instead of 'defaultValues'
  });

  // No longer need useEffect to reset form - 'values' prop handles it automatically

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
      options = [], // For select, radio, checkbox groups
      rows = 4, // For textarea
      disabled = false,
      className: fieldClassName = "",
    } = field;

    // Render the appropriate input component based on type
    const renderInput = (formField) => {
      // Text Input, Email, Password, Number, etc.
      if (["text", "email", "tel", "number", "url", "date"].includes(type)) {
        return (
          <Input
            type={type}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            {...formField}
          />
        );
      }
     if (type === "password") {
      return (
        <PasswordInput
          // ❌ REMOVE THIS LINE: type={type} 
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          {...formField}
        />
      );
    }

      // File Input
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
        const selectValue = formField.value ? formField.value.toString() : undefined;
        return (
          <Select
            onValueChange={formField.onChange}
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

      // Multi-Select
      if (type === "multiselect") {
        const selectedValues = formField.value || [];
        return (
          <div className="space-y-2">
            <select
              multiple
              value={selectedValues.map(v => v.toString())}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => Number(option.value) || option.value);
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
