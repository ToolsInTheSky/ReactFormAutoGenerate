import { useState, useEffect } from 'react';
import { Box, Typography, Divider } from '@mui/material';

/**
 * SchemaFetcher Component
 * Fetches and displays all available backend schemas, organized by library type (RJSF/Uniforms).
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

    if (loading) return <Typography>Loading schemas...</Typography>;
    if (error) return <Typography color="error">Error fetching schemas: {error}</Typography>;

    /**
     * Recursively renders schema categories and their definitions.
     */
    const renderSchemas = (data, depth = 0) => {
        return Object.entries(data).map(([key, value]) => {
            if (value && typeof value === 'object' && !value.type && !value.properties) {
                // If it's a category (RJSF, Uniforms), render a heading
                return (
                    <Box key={key} sx={{ mt: depth === 0 ? 4 : 2, mb: 2 }}>
                        <Typography variant={depth === 0 ? "h4" : "h5"} color="primary" gutterBottom>
                            {key} Schemas
                        </Typography>
                        {depth === 0 && <Divider sx={{ mb: 2 }} />}
                        <Box sx={{ ml: depth === 0 ? 0 : 2 }}>
                            {renderSchemas(value, depth + 1)}
                        </Box>
                    </Box>
                );
            } else {
                // If it's a specific schema definition, render it in a pre tag
                return (
                    <Box key={key} sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{key}</Typography>
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
                    </Box>
                );
            }
        });
    };

    return (
        <Box sx={{ textAlign: 'left', p: 2 }}>
            <Typography variant="h3" gutterBottom>Backend Model Schemas</Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                Below are the raw JSON schemas exported from the .NET 9 backend. 
                Note how they are slightly adjusted for different frontend libraries.
            </Typography>
            {schemas && renderSchemas(schemas)}
        </Box>
    );
}

export default SchemaFetcher;
