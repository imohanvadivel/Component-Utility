import { copyInstanceProperties, preventOverides } from "./util";

function cloneComponents() {
    const selection = figma.currentPage.selection;

    const componentAry = selection.filter((node) => node.type === "COMPONENT") as ComponentNode[];
    const instanceAry = selection.filter((node) => node.type === "INSTANCE") as InstanceNode[];

    if (componentAry.length === 0) figma.closePlugin("kindly select atleast one master component");
    if (componentAry.length > 1) figma.closePlugin("Kindly select only one master component");

    let newMasterComponent = componentAry[0].clone();
    // @ts-ignore
    instanceAry.forEach((instance) => instance.swapComponent(newMasterComponent));

    figma.currentPage.appendChild(newMasterComponent);
    let masterCompCord = getMasterCompCord(instanceAry[0]);
    newMasterComponent.x = masterCompCord.x;
    newMasterComponent.y = masterCompCord.y;
    figma.currentPage.selection = [newMasterComponent];
    figma.viewport.scrollAndZoomIntoView([newMasterComponent, masterCompCord.rootNode]);

    function getMasterCompCord(node: InstanceNode) {
        function getRootNode(node: SceneNode): SceneNode {
            if (node.parent?.type === "PAGE") {
                return node;
            }
            // @ts-ignore
            return getRootNode(node.parent);
        }

        let rootNode = getRootNode(node);

        let x = rootNode.x;
        let y = rootNode.y - node.height - 80;

        return { x, y, rootNode };
    }

    figma.closePlugin("Cloned the master component and linked all nodes to it");
}

async function linkComponents() {
    const selection = figma.currentPage.selection;

    const componentAry = selection.filter((node) => node.type === "COMPONENT") as ComponentNode[];
    let masterComponent = componentAry[0];

    if (componentAry.length === 0) figma.closePlugin("kindly select atleast one master component");
    if (componentAry.length > 1) figma.closePlugin("Kindly select only one master component");

    const nodesAry = selection.filter((node) => node.type !== "COMPONENT");

    let promises = nodesAry.map(async (node) => {
        if (node.type !== "INSTANCE") {
            let siblings = node.parent!.children;
            let index = siblings.findIndex((e) => e.id === node.id);

            let instance = masterComponent.createInstance();
            instance.x = node.x;
            instance.y = node.y;

            node.parent?.insertChild(index, instance);

            if ("children" in node) {
                // @ts-ignore
                await preventOverides(node.children, instance.children);
            } else {
                await preventOverides([node], [instance]);
            }

            node.remove();
            return;
        }

        (node as any).swapComponent(masterComponent);
    });

    let mainres = await Promise.all(promises);
    console.log({ mainres });

    figma.closePlugin(`${nodesAry.length} nodes has been linked to ${masterComponent.name}`);
}

let command = figma.command;

switch (command) {
    case "clone":
        cloneComponents();
        break;
    case "link":
        linkComponents();
        break;
}
