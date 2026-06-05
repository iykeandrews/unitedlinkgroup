import React from 'react';
type Props = {
    children: React.ReactNode;
};
type State = {
    hasError: boolean;
    message?: string;
};
export default class ErrorBoundary extends React.Component<Props, State> {
    state: State;
    static getDerivedStateFromError(error: any): {
        hasError: boolean;
        message: string;
    };
    componentDidCatch(error: any): void;
    render(): string | number | boolean | React.JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
export {};
