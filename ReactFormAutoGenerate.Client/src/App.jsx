import { useState } from 'react';
import './App.css';
import SchemaFetcher from './components/common/SchemaFetcher';
import { Refine } from "@refinedev/core";
import { LightTheme, useNotificationProvider, RefineSnackbarProvider } from "@refinedev/mui";
import { ThemeProvider, CssBaseline, Button, Box, createTheme, Collapse, Paper, Typography, Container } from "@mui/material";
import dataProvider from "@refinedev/simple-rest";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { RefineRjsfExample } from './RefineRjsfExample';
import { RefineUniformExample } from './RefineUniformExample';

/**
 * Material UI Theme Configuration
 */
const theme = createTheme(LightTheme || {});

/**
 * Refine Context Wrapper
 * Configures the data provider and resources for the Refine framework.
 */
const RefineContextWrapper = ({ children }) => {
    const notificationProvider = useNotificationProvider();
    const apiBaseUrl = window.location.origin + "/api";

    return (
        <Refine
            dataProvider={dataProvider(apiBaseUrl)}
            notificationProvider={notificationProvider}
            resources={[
                { name: "products" },
                { name: "categories" }
            ]}
            options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
            }}
        >
            {children}
        </Refine>
    );
};

/**
 * HomePage Component
 * Landing page that introduces the schema-driven UI generation concept
 * and provides navigation to different library implementations.
 */
const HomePage = () => {
    const [showSchemas, setShowSchemas] = useState(false);

    return (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Schema-Driven UI Generator
            </Typography>
            <Typography variant="h6" color="textSecondary" paragraph>
                Automatically generate functional CRUD Forms and Lists by consuming 
                JSON Schemas directly from the backend. Compare different ecosystem 
                libraries and their integration with the Refine framework.
            </Typography>

            {/* Schema Exploration Section */}
            <Box sx={{ mt: 4, mb: 4 }}>
                <Button 
                    variant="outlined" 
                    onClick={() => setShowSchemas(!showSchemas)}
                    endIcon={showSchemas ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                    {showSchemas ? "Hide Raw Backend Schemas" : "Explore Backend Schemas"}
                </Button>
                
                <Collapse in={showSchemas} sx={{ mt: 2 }}>
                    <Paper elevation={3} sx={{ p: 2, bgcolor: '#f5f5f5', textAlign: 'left' }}>
                        <SchemaFetcher />
                    </Paper>
                </Collapse>
            </Box>

            <hr style={{ opacity: 0.2, margin: '40px 0' }} />

            {/* Library Comparison Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                
                <Box sx={{ maxWidth: 500 }}>
                    <Typography variant="h5" gutterBottom>Refine + RJSF</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Uses <b>react-jsonschema-form</b> to render high-fidelity forms 
                        directly from .NET 9 generated JSON schemas.
                    </Typography>
                    <Button 
                        variant="contained" 
                        component={Link} 
                        to="/refine-rjsf-example"
                        size="large"
                        fullWidth
                    >
                        Go to RJSF Example
                    </Button>
                </Box>
                
                <Box sx={{ maxWidth: 500 }}>
                    <Typography variant="h5" gutterBottom>Refine + Uniforms</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Leverages <b>Uniforms</b> with AJV validation for a highly 
                        customizable and performant schema-to-form bridge.
                    </Typography>
                    <Button 
                        variant="contained" 
                        color="secondary"
                        component={Link} 
                        to="/refine-uniform-example"
                        size="large"
                        fullWidth
                    >
                        Go to Uniforms Example
                    </Button>
                </Box>

            </Box>
        </Container>
    );
};

/**
 * Main App Component
 * Sets up routing, theme, and global providers.
 */
function App() {
    return (
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <RefineSnackbarProvider>
                    <RefineContextWrapper>
                        <Routes>
                            <Route index element={<HomePage />} />
                            <Route path="/refine-rjsf-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>
                                        ← Back to Selection
                                    </Button>
                                    <RefineRjsfExample />
                                </Box>
                            } />
                            <Route path="/refine-uniform-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>
                                        ← Back to Selection
                                    </Button>
                                    <RefineUniformExample />
                                </Box>
                            } />
                        </Routes>
                    </RefineContextWrapper>
                </RefineSnackbarProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}

export default App;
