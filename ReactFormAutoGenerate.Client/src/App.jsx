import { useState } from 'react';
import './App.css';
import SchemaFetcher from './components/common/SchemaFetcher';
import { Refine } from "@refinedev/core";
import { LightTheme, useNotificationProvider, RefineSnackbarProvider } from "@refinedev/mui";
import { ThemeProvider, CssBaseline, Button, Box, createTheme, Collapse, Paper, Typography, Container, Divider } from "@mui/material";
import dataProvider from "@refinedev/simple-rest";
import gqlDataProvider from "@refinedev/nestjs-query";
import { GraphQLClient } from "graphql-request";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { RestRjsfExample } from './RestRjsfExample';
import { RestUniformExample } from './RestUniformExample';
import { GraphQLRjsfExample } from './GraphQLRjsfExample';
import { GraphQLUniformExample } from './GraphQLUniformExample';

/**
 * Material UI Theme Configuration
 */
const theme = createTheme(LightTheme || {});

const API_URL = window.location.origin + "/api";
const GQL_URL = window.location.origin + "/graphql";

/**
 * Refine Context Wrapper
 * Configures multiple data providers for both REST and GraphQL.
 */
const RefineContextWrapper = ({ children }) => {
    const notificationProvider = useNotificationProvider();
    
    // REST Client
    const restProvider = dataProvider(API_URL);
    
    // GraphQL Client
    const gqlClient = new GraphQLClient(GQL_URL);
    const graphQLProvider = gqlDataProvider(gqlClient);

    return (
        <Refine
            dataProvider={{
                default: restProvider,
                graphql: graphQLProvider
            }}
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
 */
const HomePage = () => {
    const [showSchemas, setShowSchemas] = useState(false);

    return (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Schema-Driven UI Generator
            </Typography>
            <Typography variant="h6" color="textSecondary" paragraph>
                Compare REST and GraphQL implementations of dynamic UI generation 
                using RJSF and Uniforms.
            </Typography>

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

            <Divider sx={{ my: 4 }}>RESTful API Examples</Divider>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 3, maxWidth: 350, flex: '1 1 300px' }}>
                    <Typography variant="h5" gutterBottom>REST + RJSF</Typography>
                    <Button variant="contained" component={Link} to="/rest-rjsf-example" fullWidth>Go to REST + RJSF</Button>
                </Paper>
                <Paper sx={{ p: 3, maxWidth: 350, flex: '1 1 300px' }}>
                    <Typography variant="h5" gutterBottom>REST + Uniforms</Typography>
                    <Button variant="contained" color="secondary" component={Link} to="/rest-uniform-example" fullWidth>Go to REST + Uniforms</Button>
                </Paper>
            </Box>

            <Divider sx={{ my: 4 }}>GraphQL Examples</Divider>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 3, maxWidth: 350, flex: '1 1 300px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="h5" gutterBottom>GraphQL + RJSF</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Dynamic Listing and Mutation via GraphQL</Typography>
                    <Button variant="contained" color="primary" component={Link} to="/graphql-rjsf-example" fullWidth>Go to GraphQL + RJSF</Button>
                </Paper>
                <Paper sx={{ p: 3, maxWidth: 350, flex: '1 1 300px', border: '1px solid #e0e0e0' }}>
                    <Typography variant="h5" gutterBottom>GraphQL + Uniforms</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Complex Schemas and Validation via GraphQL</Typography>
                    <Button variant="contained" color="secondary" component={Link} to="/graphql-uniform-example" fullWidth>Go to GraphQL + Uniforms</Button>
                </Paper>
            </Box>
        </Container>
    );
};

function App() {
    return (
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <RefineSnackbarProvider>
                    <RefineContextWrapper>
                        <Routes>
                            <Route index element={<HomePage />} />
                            <Route path="/rest-rjsf-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>← Back</Button>
                                    <RestRjsfExample />
                                </Box>
                            } />
                            <Route path="/rest-uniform-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>← Back</Button>
                                    <RestUniformExample />
                                </Box>
                            } />
                            <Route path="/graphql-rjsf-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>← Back</Button>
                                    <GraphQLRjsfExample />
                                </Box>
                            } />
                            <Route path="/graphql-uniform-example" element={
                                <Box sx={{ p: 4 }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 4 }}>← Back</Button>
                                    <GraphQLUniformExample />
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
