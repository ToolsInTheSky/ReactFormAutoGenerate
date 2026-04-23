import { useEffect, useState } from 'react';
import './App.css';
import SchemaFetcher from './SchemaFetcher';
import { Refine } from "@refinedev/core";
import { LightTheme, useNotificationProvider, RefineSnackbarProvider } from "@refinedev/mui";
import { ThemeProvider, CssBaseline, Button, Box, createTheme } from "@mui/material";
import dataProvider from "@refinedev/simple-rest";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { RefineRjsfExample } from './RefineRjsfExample';

// Explicitly creating theme to ensure all MUI internal properties (like spacing) are present
const theme = createTheme(LightTheme || {});

const RefineContextWrapper = ({ children }) => {
    const notificationProvider = useNotificationProvider();
    const apiBaseUrl = window.location.origin + "/api";

    return (
        <Refine
            dataProvider={dataProvider(apiBaseUrl)}
            notificationProvider={notificationProvider}
            resources={[
                {
                    name: "products",
                },
                {
                    name: "categories",
                }
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

const HomePage = ({ contents }) => (
    <div style={{ padding: '20px' }}>
        <h1 id="tabelLabel">Weather forecast</h1>
        <p>This component demonstrates fetching data from the server.</p>
        {contents}
        <hr />
        <SchemaFetcher />
        <hr />
        <Box sx={{ mt: 4, textAlign: 'center' }}>
            <h2>Try Refine + RJSF Integration</h2>
            <p>Click the button below to see how .NET 9 schemas can automatically generate forms.</p>
            <Button 
                variant="contained" 
                component={Link} 
                to="/refine-rjsf-example"
                size="large"
            >
                Go to Refine + RJSF Example
            </Button>
        </Box>
    </div>
);

function App() {
    const [forecasts, setForecasts] = useState();

    useEffect(() => {
        populateWeatherData();
    }, []);

    const contents = forecasts === undefined
        ? <p><em>Loading... Please refresh after the ASP.NET Core server has started.</em></p>
        : <table className="table table-striped" aria-labelledby="tabelLabel">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Temp. (C)</th>
                    <th>Temp. (F)</th>
                    <th>Summary</th>
                </tr>
            </thead>
            <tbody>
                {forecasts.map(forecast =>
                    <tr key={forecast.date}>
                        <td>{forecast.date}</td>
                        <td>{forecast.temperatureC}</td>
                        <td>{forecast.temperatureF}</td>
                        <td>{forecast.summary}</td>
                    </tr>
                )}
            </tbody>
        </table>;

    return (
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <RefineSnackbarProvider>
                    <RefineContextWrapper>
                        <Routes>
                            <Route index element={<HomePage forecasts={forecasts} contents={contents} />} />
                            <Route path="/refine-rjsf-example" element={
                                <div style={{ padding: '20px' }}>
                                    <Button component={Link} to="/" variant="outlined" sx={{ mb: 2 }}>
                                        ← Back to Home
                                    </Button>
                                    <RefineRjsfExample />
                                </div>
                            } />
                        </Routes>
                    </RefineContextWrapper>
                </RefineSnackbarProvider>
            </ThemeProvider>
        </BrowserRouter>
    );

    async function populateWeatherData() {
        const response = await fetch('/weatherforecast');
        if (response.ok) {
            const data = await response.json();
            setForecasts(data);
        }
    }
}

export default App;
