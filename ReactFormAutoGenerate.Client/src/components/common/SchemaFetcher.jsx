import { useState, useEffect } from 'react';

/**
 * SchemaFetcher Component
 * Fetches and displays all available backend schemas (KendoReact Edition).
 */
function SchemaFetcher() {
    const [schemas, setSchemas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchemas = async () => {
            try {
                const response = await fetch('/api/schema/all');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setSchemas(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSchemas();
    }, []);

    if (loading) return <div>Loading schemas...</div>;
    if (error) return <div style={{ color: 'red' }}>Error fetching schemas: {error}</div>;

    const renderSchemas = (data, depth = 0) => {
        return Object.entries(data).map(([key, value]) => {
            if (value && typeof value === 'object' && !value.type && !value.properties) {
                return (
                    <div key={key} style={{ marginTop: depth === 0 ? '40px' : '20px', marginBottom: '20px' }}>
                        <h3 style={{ color: '#ff6358', borderBottom: depth === 0 ? '2px solid #ff6358' : 'none', paddingBottom: '10px' }}>
                            {key} Schemas
                        </h3>
                        <div style={{ marginLeft: depth === 0 ? '0' : '20px' }}>
                            {renderSchemas(value, depth + 1)}
                        </div>
                    </div>
                );
            } else {
                return (
                    <div key={key} style={{ marginBottom: '30px' }}>
                        <h4 style={{ fontWeight: 'bold' }}>{key}</h4>
                        <pre style={{ 
                            background: '#f4f4f4', 
                            padding: '15px', 
                            borderRadius: '8px',
                            overflowX: 'auto',
                            color: '#333',
                            fontSize: '0.85rem',
                            border: '1px solid #ddd'
                        }}>
                            {JSON.stringify(value, null, 2)}
                        </pre>
                    </div>
                );
            }
        });
    };

    return (
        <div style={{ textAlign: 'left', padding: '10px' }}>
            <h2 style={{ marginBottom: '10px' }}>Backend Model Schemas</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Below are the raw JSON schemas exported from the .NET 9 backend. 
                Note how they are slightly adjusted for different frontend libraries.
            </p>
            {schemas && renderSchemas(schemas)}
        </div>
    );
}

export default SchemaFetcher;
