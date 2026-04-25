import React, { useState } from 'react';
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import { GraphQLUniformEntityManager } from './components/graphql/uniform/GraphQLUniformEntityManager';

export const GraphQLUniformExample = () => {
    const [selected, setSelected] = useState(0);

    const handleSelect = (e) => {
        setSelected(e.selected);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>GraphQL + Refine + Uniforms (KendoReact)</h2>
            </div>

            <TabStrip selected={selected} onSelect={handleSelect}>
                <TabStripTab title="Products">
                    <div style={{ marginTop: '20px' }}>
                        <GraphQLUniformEntityManager 
                            resource="products"
                            entityName="Product"
                            selectOptions={{
                                CategoryId: {
                                    resource: 'categories',
                                    labelField: 'Name'
                                }
                            }}
                        />
                    </div>
                </TabStripTab>
                <TabStripTab title="Categories">
                    <div style={{ marginTop: '20px' }}>
                        <GraphQLUniformEntityManager 
                            resource="categories"
                            entityName="Category"
                        />
                    </div>
                </TabStripTab>
            </TabStrip>
        </div>
    );
};
