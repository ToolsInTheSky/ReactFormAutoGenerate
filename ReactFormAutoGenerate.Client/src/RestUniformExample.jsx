import React, { useState } from 'react';
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import { UniformEntityManager } from './components/rest/uniform/UniformEntityManager';

export const RestUniformExample = () => {
    const [selected, setSelected] = useState(0);

    const handleSelect = (e) => {
        setSelected(e.selected);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>REST + Refine + Uniforms (KendoReact)</h2>
            </div>

            <TabStrip selected={selected} onSelect={handleSelect}>
                <TabStripTab title="Products">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            resource="products"
                            title="Product"
                            schemaUrl="/api/schema/uniforms/product"
                            selectOptions={{
                                CategoryId: {
                                    resource: 'categories',
                                    label: 'Category',
                                    // These will be used by our custom SelectField
                                    options: [] 
                                }
                            }}
                        />
                    </div>
                </TabStripTab>
                <TabStripTab title="Categories">
                    <div style={{ marginTop: '20px' }}>
                        <UniformEntityManager 
                            resource="categories"
                            title="Category"
                            schemaUrl="/api/schema/uniforms/category"
                        />
                    </div>
                </TabStripTab>
            </TabStrip>
        </div>
    );
};
