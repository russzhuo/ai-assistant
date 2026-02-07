// components/ui/Button.tsx
import cn from "classnames";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
type ButtonSize = "sm" | "default" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // basic
          "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]",

          // size
          {
            "px-6 py-2.5 text-sm": size === "sm",
            "px-7 py-3.5 text-base": size === "default",
            "px-9 py-4 text-lg": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },

          // variant
          {
            // primary
            "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-600/40":
              variant === "primary",

            // secondary
            "bg-gray-200 text-gray-900 hover:bg-gray-300":
              variant === "secondary",

            // outline
            "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50":
              variant === "outline",

            // ghost
            "bg-transparent text-gray-700 hover:bg-gray-100":
              variant === "ghost",

            // destructive
            "bg-red-600 text-white hover:bg-red-700 shadow-red-500/30":
              variant === "destructive",
          },

          // disabled
          "disabled:opacity-55 disabled:pointer-events-none disabled:shadow-none",
          
          "hover: cursor-pointer",
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
