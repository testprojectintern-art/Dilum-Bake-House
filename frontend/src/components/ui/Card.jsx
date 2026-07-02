export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`glass-panel rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}