/**
 * @file RestListExample.jsx
 * @description Example page showing a paginated list of products using REST API.
 */

import React from 'react';
import AutoListView from './components/autolist/AutoListView';

export const RestListExample = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>REST + Kendo ListView (Products)</h2>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <AutoListView 
                    protocol="rest" 
                    resource="products" 
                    title="Product Catalog (REST)" 
                />
            </div>
        </div>
    );
};
