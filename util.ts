function clone<T>(val: T): T {
    return JSON.parse(JSON.stringify(val));
}

function copyFill(nodeA: any, nodeB: any): void {
    if (!("fills" in nodeA && nodeA.fills.length > 0)) return;

    if ("fillStyleId" in nodeA && nodeA.fillStyleId) {
        (nodeB as any).fillStyleId = nodeA.fillStyleId;
    } else {
        let fills = clone((nodeA as any).fills);
        (nodeB as any).fills = fills;
    }
}

function copyStroke(nodeA: any, nodeB: any): void {
    if (!("strokes" in nodeA && nodeA.strokes.length > 0)) return;

    nodeB.strokeAlign = nodeA.strokeAlign;
    nodeB.strokeMiterLimit = nodeA.strokeMiterLimit;

    // Handling dashed pattern
    if ("dashPattern" in nodeA && nodeA.dashPattern.length > 0) {
        nodeB.dashPattern = clone(nodeA.dashPattern);
    }

    // Need to handle mixed case for stroke cap
    if (typeof nodeA.strokeCap === "string") nodeB.strokeCap = nodeA.strokeCap;
    if (typeof nodeA.strokeJoin === "string") nodeB.strokeJoin = nodeA.strokeJoin;

    if (typeof nodeA.strokeWeight == "symbol") {
        nodeB.strokeTopWeight = nodeA.strokeTopWeight;
        nodeB.strokeBottomWeight = nodeA.strokeBottomWeight;
        nodeB.strokeLeftWeight = nodeA.strokeLeftWeight;
        nodeB.strokeRightWeight = nodeA.strokeRightWeight;
    } else {
        nodeB.strokeWeight = nodeA.strokeWeight;
    }

    if ("strokeStyleId" in nodeA && nodeA.strokeStyleId) {
        (nodeB as any).strokeStyleId = nodeA.strokeStyleId;
    } else {
        let storkes = clone((nodeA as any).strokes);
        (nodeB as any).strokes = storkes;
    }
}

function copyEffects(nodeA: any, nodeB: any): void {
    if (!("effects" in nodeA && nodeA.effects.length > 0)) return;

    console.log(nodeA, nodeB);

    if ("effectStyleId" in nodeA && nodeA.effectStyleId) {
        (nodeB as any).effectStyleId = nodeA.effectStyleId;
    } else {
        let effects = clone((nodeA as any).effects);
        (nodeB as any).effects = effects;
    }
}

function copyCornerRadius(nodeA: any, nodeB: any): void {
    if (!("cornerRadius" in nodeA)) return;

    nodeB.cornerSmoothing = nodeA.cornerSmoothing;

    if (typeof nodeA.cornerRadius === "symbol") {
        nodeB.topLeftRadius = nodeA.topLeftRadius;
        nodeB.topRightRadius = nodeA.topRightRadius;
        nodeB.bottomLeftRadius = nodeA.bottomLeftRadius;
        nodeB.bottomRightRadius = nodeA.bottomRightRadius;
    } else {
        nodeB.cornerRadius = nodeA.cornerRadius;
    }
}

function copyText(nodeA: TextNode, nodeB: any) {
    if (nodeA.type !== "TEXT") return;

    // copy Characters
    nodeB.characters = nodeA.characters;

    let prop = [
        "fontSize",
        "fontName",
        "textStyleId",
        "fontWeight",
        "textDecoration",
        "textCase",
        "lineHeight",
        "letterSpacing",
        "listOptions",
        "indentation",
        "hyperlink",
        "fills",
        "fillStyleId",
    ];

    //@ts-ignore - get range details
    let segments = nodeA.getStyledTextSegments(prop);

    // loop over the range and set the font details
    segments.forEach((seg: any) => {
        nodeB.setRangeFontSize(seg.start, seg.end, seg.fontSize);
        nodeB.setRangeFontName(seg.start, seg.end, seg.fontName);
        nodeB.setRangeHyperlink(seg.start, seg.end, seg.hyperlink);
        nodeB.setRangeListOptions(seg.start, seg.end, seg.listOptions);
        nodeB.setRangeIndentation(seg.start, seg.end, seg.indentation);

        if (seg.textStyleId) {
            nodeB.setRangeTextStyleId(seg.start, seg.end, seg.textStyleId);
        } else {
            nodeB.getRangeFontWeight(seg.start, seg.end, seg.fontWeight);
            nodeB.setRangeTextDecoration(seg.start, seg.end, seg.textDecoration);
            nodeB.setRangeTextCase(seg.start, seg.end, seg.textCase);
            nodeB.setRangeLineHeight(seg.start, seg.end, seg.lineHeight);
            nodeB.setRangeLetterSpacing(seg.start, seg.end, seg.letterSpacing);
        }

        seg.fillStyleId
            ? nodeB.setRangeFillStyleId(seg.start, seg.end, seg.fillStyleId)
            : nodeB.setRangeFills(seg.start, seg.end, seg.fills);
    });
}

function copyArcData(nodeA: any, nodeB: any) {
    if (nodeA.type !== "ELLIPSE") return;
    nodeB.arcData = clone(nodeA.arcData);
}

function copyAutoLayout(nodeA: any, nodeB: any) {
    if (!("layoutMode" in nodeA && nodeA.layoutMode !== "NONE")) return;
    nodeB.layoutMode = nodeA.layoutMode;
    nodeB.primaryAxisSizingMode = nodeA.primaryAxisSizingMode;
    nodeB.counterAxisSizingMode = nodeA.counterAxisSizingMode;
    nodeB.primaryAxisAlignItems = nodeA.primaryAxisAlignItems;
    nodeB.counterAxisAlignItems = nodeA.counterAxisAlignItems;
    nodeB.paddingLeft = nodeA.paddingLeft;
    nodeB.paddingRight = nodeA.paddingRight;
    nodeB.paddingTop = nodeA.paddingTop;
    nodeB.paddingBottom = nodeA.paddingBottom;
    nodeB.itemSpacing = nodeA.itemSpacing;
    nodeB.itemReverseZIndex = nodeA.itemReverseZIndex;
    nodeB.strokesIncludedInLayout = nodeA.strokesIncludedInLayout;
}

export function copyInstanceProperties(nodeA: any, nodeB: any) {
    if (nodeA.type === "INSTANCE") {
        // Scale Factor
        // nodeB.scaleFactor = (nodeA as any).scaleFactor;

        let rawProp = (nodeA as any).componentProperties;
        let prop = {};

        for (let p in rawProp) {
            // @ts-ignore
            prop[p] = rawProp[p].value;
        }

        nodeB.setProperties(prop);
    }
}

async function compareNodes(nodeA: SceneNode, nodeB: any) {
    console.log("Trip: ", nodeA.name, nodeB.type);

    // Instance Node Component Properties
    if (nodeA.type === "INSTANCE") {
        copyInstanceProperties(nodeA, nodeB);
    }

    // Text Node
    if (nodeA.type === "TEXT") {
        // @ts-ignore
        let allFontNames = nodeA.getRangeAllFontNames(0, nodeA.characters.length);
        await Promise.all(allFontNames.map(figma.loadFontAsync));

        let res = copyText(nodeA, nodeB);
        console.log({ textPromise: res });
        return;
    }

    // Ellipse Arc Data
    if (nodeA.type === "ELLIPSE") {
        copyArcData(nodeA, nodeB);
    }

    // Blend Modes
    if ("blendMode" in nodeA) {
        nodeB.blendMode = nodeA.blendMode;
    }

    // layoutAlign, layoutGrow, layoutPositioning
    if ("layoutAlign" in nodeA) nodeB.layoutAlign = nodeA.layoutAlign;
    if ("layoutGrow" in nodeA) nodeB.layoutGrow = nodeA.layoutGrow;
    if ("layoutPositioning" in nodeA) nodeB.layoutPositioning = nodeA.layoutPositioning;

    copyAutoLayout(nodeA, nodeB);
    copyStroke(nodeA, nodeB);
    copyFill(nodeA, nodeB);
    copyCornerRadius(nodeA, nodeB);
    copyEffects(nodeA, nodeB);

    return 1;
}

export async function preventOverides(aNodes: any[], bNodes: any[]) {
    for (let i = 0; i < aNodes.length; i++) {
        if (aNodes[i].type === bNodes[i].type) {
            await compareNodes(aNodes[i], bNodes[i]);

            if ("children" in aNodes[i] && "children" in bNodes[i]) {
                // @ts-ignore
                await preventOverides(aNodes[i].children, bNodes[i].children);
            }
        }
    }
}
