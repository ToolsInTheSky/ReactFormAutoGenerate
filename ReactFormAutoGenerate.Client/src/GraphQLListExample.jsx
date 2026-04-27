/**
 * @file GraphQLListExample.jsx
 * @description Example page showing a paginated list of products using GraphQL.
 */

import React from 'react';
import AutoListView from './components/autolist/AutoListView';

export const GraphQLListExample = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>GraphQL + Kendo ListView (Products)</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="graphql" 
                    entityName="Product" 
                    title="Product Catalog (GraphQL)" 
                />
            </div>
        </div>
    );
};
