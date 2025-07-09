
const Spinner = ({ 
    size = "12", 
    color = "white", 
    className = "" 
}) => {
    return (
        <div 
            className={`animate-spin rounded-full h-${size} w-${size} border-b-2 border-${color} ${className}`}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;
