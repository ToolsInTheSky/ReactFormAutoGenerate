import { useState, useEffect } from 'react';

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
    if (error) return <div>Error fetching schemas: {error}</div>;

    return (
        <div style={{ textAlign: 'left', margin: '20px' }}>
            <h2>Backend Model Schemas</h2>
            {schemas && Object.entries(schemas).map(([name, schema]) => (
                <div key={name} style={{ marginBottom: '20px' }}>
                    <h3>{name}</h3>
                    <pre style={{ 
                        background: '#f4f4f4', 
                        padding: '10px', 
                        borderRadius: '5px',
                        overflowX: 'auto',
                        color: '#333'
                    }}>
                        {JSON.stringify(schema, null, 2)}
                    </pre>
                </div>
            ))}
        </div>
    );
}

export default SchemaFetcher;
