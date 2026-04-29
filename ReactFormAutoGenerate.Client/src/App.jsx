/**
 * @file App.jsx
 * @description Main application component that configures global providers, routing, and layouts.
 * Now supports dynamic KendoReact theme switching.
 */

import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { Fade } from "@progress/kendo-react-animation";
import { Button } from "@progress/kendo-react-buttons";
import { SvgIcon } from "@progress/kendo-react-common";
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Card, CardBody, CardTitle } from "@progress/kendo-react-layout";
import {
    Notification,
    NotificationGroup,
} from "@progress/kendo-react-notification";
import {
    arrowLeftIcon,
    chevronDownIcon,
    chevronUpIcon,
    paletteIcon,
} from "@progress/kendo-svg-icons";
import { Refine } from "@refinedev/core";
import gqlDataProvider from "@refinedev/nestjs-query";
import { axiosInstance } from "@refinedev/simple-rest";
import { GraphQLClient } from "graphql-request";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { createDataProvider } from "./components/autoform/refineDataProvider";
import SchemaFetcher from "./components/autoform/SchemaFetcher";
import { GraphQLListExample } from "./GraphQLListExample";
import { GraphQLRjsfExample } from "./GraphQLRjsfExample";
import { GraphQLUniformExample } from "./GraphQLUniformExample";
import { RestKeylessExample } from "./RestKeylessExample";
import { RestListExample } from "./RestListExample";
import { RestRjsfExample } from "./RestRjsfExample";
import { RestUniformExample } from "./RestUniformExample";

const API_URL = window.location.origin + "/api";
const GQL_URL = window.location.origin + "/graphql";

/**
 * Theme Definitions
 */
const themes = [
    {
        text: "Default (Kendo)",
        id: "default",
        href: "https://unpkg.com/@progress/kendo-theme-default@13.1.1/dist/all.css",
    },
    {
        text: "Bootstrap",
        id: "bootstrap",
        href: "https://unpkg.com/@progress/kendo-theme-bootstrap@13.1.1/dist/all.css",
    },
    {
        text: "Material",
        id: "material",
        href: "https://unpkg.com/@progress/kendo-theme-material@13.1.1/dist/all.css",
    },
    {
        text: "Fluent",
        id: "fluent",
        href: "https://unpkg.com/@progress/kendo-theme-fluent@13.1.1/dist/all.css",
    },
];

/**
 * Custom Hook: useKendoNotification
 */
const useKendoNotification = () => {
    const [notifications, setNotifications] = useState([]);

    const open = useCallback(({ message, type, key }) => {
        const id = key || Math.random().toString();
        setNotifications((prev) => [
            ...prev,
            { id, message, type: type === "error" ? "error" : "success" },
        ]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
    }, []);

    const close = useCallback((key) => {
        setNotifications((prev) => prev.filter((n) => n.id !== key));
    }, []);

    return {
        notificationProps: { notifications, onClose: close },
        notificationProvider: { open, close },
    };
};

/**
 * RefineContextWrapper Component
 */
const RefineContextWrapper = ({ children, notificationProvider }) => {
    const restProvider = createDataProvider(API_URL);
    const gqlClient = new GraphQLClient(GQL_URL);
    const graphQLProvider = gqlDataProvider(gqlClient);

    return (
        <Refine
            dataProvider={{
                default: restProvider,
                graphql: graphQLProvider,
            }}
            notificationProvider={notificationProvider}
            resources={[{ name: "products" }, { name: "categories" }]}
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
const HomePage = ({ currentTheme, onThemeChange }) => {
    const [showSchemas, setShowSchemas] = useState(false);

    return (
        <div
            style={{
                maxWidth: "900px",
                margin: "0 auto",
                padding: "40px 20px",
                textAlign: "center",
                fontFamily: "sans-serif",
            }}
        >
            <h1
                style={{ fontSize: "2.5rem", color: "#ff6358", marginBottom: "10px" }}
            >
                Schema-Driven UI Generator
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#666", marginBottom: "30px" }}>
                Explore dynamic Form generation and advanced List views with
                interchangeable KendoReact Themes.
            </p>

            {/* Theme Selector Section */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "15px",
                    marginBottom: "40px",
                    padding: "15px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "10px",
                }}
            >
                <SvgIcon icon={paletteIcon} size="medium" />
                <span style={{ fontWeight: "bold" }}>Choose Theme:</span>
                <DropDownList
                    data={themes}
                    textField="text"
                    dataItemKey="id"
                    value={currentTheme}
                    onChange={(e) => onThemeChange(e.target.value)}
                    style={{ width: "200px" }}
                />
            </div>

            <div style={{ marginBottom: "40px" }}>
                <Button fillMode="outline" onClick={() => setShowSchemas(!showSchemas)}>
                    {showSchemas
                        ? "Hide Raw Backend Schemas "
                        : "Explore Backend Schemas "}
                    <SvgIcon icon={showSchemas ? chevronUpIcon : chevronDownIcon} />
                </Button>
                <Fade>
                    {showSchemas && (
                        <div
                            style={{
                                marginTop: "20px",
                                textAlign: "left",
                                backgroundColor: "#f9f9f9",
                                padding: "20px",
                                borderRadius: "8px",
                                border: "1px solid #ddd",
                            }}
                        >
                            <SchemaFetcher />
                        </div>
                    )}
                </Fade>
            </div>

            {/* Section: Form Generation Examples */}
            <h2
                style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "10px",
                    margin: "40px 0 20px",
                }}
            >
                Dynamic Form Generation
            </h2>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                    marginBottom: "40px",
                }}
            >
                <Card style={{ width: "200px" }}>
                    <CardBody>
                        <CardTitle style={{ fontSize: "1rem" }}>REST + RJSF</CardTitle>
                        <Link to="/rest-rjsf-example" style={{ textDecoration: "none" }}>
                            <Button themeColor="primary" size="small">
                                Go
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
                <Card style={{ width: "200px" }}>
                    <CardBody>
                        <CardTitle style={{ fontSize: "1rem" }}>REST + Uniforms</CardTitle>
                        <Link to="/rest-uniform-example" style={{ textDecoration: "none" }}>
                            <Button themeColor="secondary" size="small">
                                Go
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
                <Card style={{ width: "200px" }}>
                    <CardBody>
                        <CardTitle style={{ fontSize: "1rem" }}>GraphQL + RJSF</CardTitle>
                        <Link to="/graphql-rjsf-example" style={{ textDecoration: "none" }}>
                            <Button themeColor="primary" size="small">
                                Go
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
                <Card style={{ width: "200px" }}>
                    <CardBody>
                        <CardTitle style={{ fontSize: "1rem" }}>
                            GraphQL + Uniforms
                        </CardTitle>
                        <Link
                            to="/graphql-uniform-example"
                            style={{ textDecoration: "none" }}
                        >
                            <Button themeColor="secondary" size="small">
                                Go
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
            </div>

            {/* Section: List View Examples */}
            <h2
                style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "10px",
                    margin: "40px 0 20px",
                }}
            >
                Advanced List View Examples
            </h2>
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                }}
            >
                <Card style={{ width: "280px" }}>
                    <CardBody>
                        <CardTitle>REST List</CardTitle>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "#666",
                                marginBottom: "20px",
                            }}
                        >
                            Kendo ListView with REST data
                        </p>
                        <Link to="/rest-list-example" style={{ textDecoration: "none" }}>
                            <Button themeColor="primary" style={{ width: "100%" }}>
                                View REST
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
                <Card style={{ width: "280px" }}>
                    <CardBody>
                        <CardTitle>REST Keyless List</CardTitle>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "#666",
                                marginBottom: "20px",
                            }}
                        >
                            Handling Tables without Primary Keys
                        </p>
                        <Link to="/rest-keyless-example" style={{ textDecoration: "none" }}>
                            <Button
                                themeColor="primary"
                                fillMode="outline"
                                style={{ width: "100%" }}
                            >
                                View Keyless
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
                <Card style={{ width: "280px" }}>
                    <CardBody>
                        <CardTitle>GraphQL List</CardTitle>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "#666",
                                marginBottom: "20px",
                            }}
                        >
                            Kendo ListView with GraphQL data
                        </p>
                        <Link to="/graphql-list-example" style={{ textDecoration: "none" }}>
                            <Button themeColor="secondary" style={{ width: "100%" }}>
                                View GraphQL
                            </Button>
                        </Link>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

function App() {
    const { notificationProps, notificationProvider } = useKendoNotification();
    const [currentTheme, setCurrentTheme] = useState(themes[0]);

    /**
     * !!! IMPORTANT: Dynamic Theme Injection !!!
     * Swaps the Kendo UI CSS link tag in the document head.
     */
    useEffect(() => {
        let link = document.getElementById("kendo-theme-link");
        if (!link) {
            link = document.createElement("link");
            link.id = "kendo-theme-link";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = currentTheme.href;
    }, [currentTheme]);

    return (
        <BrowserRouter>
            <RefineContextWrapper notificationProvider={notificationProvider}>
                <Routes>
                    <Route
                        index
                        element={
                            <HomePage
                                currentTheme={currentTheme}
                                onThemeChange={setCurrentTheme}
                            />
                        }
                    />
                    <Route
                        path="/rest-rjsf-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <RestRjsfExample />
                            </div>
                        }
                    />
                    <Route
                        path="/rest-uniform-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <RestUniformExample />
                            </div>
                        }
                    />
                    <Route
                        path="/graphql-rjsf-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <GraphQLRjsfExample />
                            </div>
                        }
                    />
                    <Route
                        path="/graphql-uniform-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <GraphQLUniformExample />
                            </div>
                        }
                    />
                    <Route
                        path="/rest-list-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <RestListExample />
                            </div>
                        }
                    />
                    <Route
                        path="/rest-keyless-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <RestKeylessExample />
                            </div>
                        }
                    />
                    <Route
                        path="/graphql-list-example"
                        element={
                            <div style={{ padding: "20px" }}>
                                <Link to="/" style={{ textDecoration: "none" }}>
                                    <Button fillMode="outline" style={{ marginBottom: "20px" }}>
                                        <SvgIcon icon={arrowLeftIcon} /> Back
                                    </Button>
                                </Link>
                                <GraphQLListExample />
                            </div>
                        }
                    />
                </Routes>

                <NotificationGroup
                    style={{
                        right: 20,
                        bottom: 20,
                        alignItems: "flex-start",
                        flexWrap: "wrap-reverse",
                    }}
                >
                    {notificationProps.notifications.map((n) => (
                        <Fade key={n.id}>
                            <Notification
                                type={{ style: n.type, icon: true }}
                                closable={true}
                                onClose={() => notificationProps.onClose(n.id)}
                            >
                                <span>{n.message}</span>
                            </Notification>
                        </Fade>
                    ))}
                </NotificationGroup>
            </RefineContextWrapper>
        </BrowserRouter>
    );
}

export default App;
