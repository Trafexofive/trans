import React from 'react';

/**
 * A simple, reusable spinner component for indicating loading states.
 */
const Spinner = ({ size = "12", color = "white" }) => {
    // Note: TailwindCSS requires full class names to be present, so dynamic
    // class concatenation like `h-${size}` won't work out of the box.
    // This is a simplified example; for production, you might use CLSX
    // with a mapping of sizes to class names.
    return (
        <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"
            role="status"
            aria-label="loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;
