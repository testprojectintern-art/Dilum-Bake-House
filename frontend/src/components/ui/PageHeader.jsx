export default function PageHeader({ title, description, actions }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
                {description && <p className="text-xs md:text-sm text-gray-600 mt-1">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}