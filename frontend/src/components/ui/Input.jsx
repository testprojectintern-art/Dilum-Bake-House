import { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    type = 'text',
    error,
    required = false,
    className = '',
    containerClassName = '',
    ...props
}, ref) => {
    // Smart split className:
    // Layout/grid/spacing classes go to the container.
    // Padding, font, colors, border classes go to the input itself.
    const classes = className.split(/\s+/).filter(Boolean);
    const containerPrefixes = ['w-', 'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-', 'flex-', 'grid-', 'col-', 'row-', 'span-', 'hidden', 'block', 'inline-block', 'relative'];
    
    const containerClasses = [];
    const inputClasses = [];
    
    classes.forEach(cls => {
        const parts = cls.split(':');
        const baseClass = parts[parts.length - 1];
        const isContainer = containerPrefixes.some(prefix => baseClass.startsWith(prefix));
        if (isContainer) {
            containerClasses.push(cls);
        } else {
            inputClasses.push(cls);
        }
    });

    const containerClassStr = containerClasses.join(' ');
    const inputClassStr = inputClasses.join(' ');

    return (
        <div className={`w-full ${containerClassStr} ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            <input
                ref={ref}
                type={type}
                className={`w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 transition ${error
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
                    } ${inputClassStr}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-650">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;