/**
 * @file GraphQLKeylessExample.jsx
 * @description Example page showcasing AutoListView with a Keyless table (ProductLog) using GraphQL.
 */

import React from 'react';
import AutoListView from './components/autolist/AutoListView';

export const GraphQLKeylessExample = () => {
    const handleRefresh = () => {
        window.location.reload();
    };

    const handleRowClick = (id, item) => {
        console.log("GraphQL Keyless Row Clicked. Composite ID:", id, "Data:", item);
        alert(`Clicked Row with Composite ID: ${id}`);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>GraphQL Keyless List (Product Logs)</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
                This table (ProductLog) has no Primary Key. ID is shown as <b>IDX:n</b> and 
                the <b>x-identity-fields</b> (composite of all columns) is used for interaction via GraphQL.
            </p>
            
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="graphql" 
                    entityName="ProductLog"
                    title="Product Activity Logs (GraphQL)" 
                    onRefresh={handleRefresh}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
};
