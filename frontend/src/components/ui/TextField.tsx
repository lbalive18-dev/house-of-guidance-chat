import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`input-field ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }
);

TextField.displayName = 'TextField';

export default TextField;
