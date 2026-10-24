"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { FlowEditor, type LoadedFlow } from "@/components/flows/flow-editor";
import type { FlowMeta } from "@/components/flows/editor-context";

export function FlowEditorCanvas({
    sessionId,
    initial,
    initialMeta,
}: {
    sessionId: string;
    initial: LoadedFlow;
    initialMeta: FlowMeta;
}) {
    return (
        <ReactFlowProvider>
            <FlowEditor sessionId={sessionId} initial={initial} initialMeta={initialMeta} />
        </ReactFlowProvider>
    );
}
