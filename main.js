import "modern-normalize"
import "./style.css";
// import data from "./data.json";
import data from "./whole_tree.json";
// import data from "./whole_slim.json";
import * as d3 from "d3";

// Specify the charts’ dimensions. The height is variable, depending on the layout.
const width = screen.width * 0.66;
const marginTop = 16;
const marginRight = 0;
const marginLeft = 0;

// Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
// (dx is a height, and dy a width). This because the tree must be viewed with the root at the
// “bottom”, in the data domain. The width of a column is based on the tree’s height.
const root = d3.hierarchy(data);
const dx = screen.width / 8;
const dy = (width - marginRight - marginLeft) / (1 + root.height);

// Define the tree layout and the shape for links.
const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3
    .linkVertical()
    .y((d) => d.y)
    .x((d) => d.x);

// Create the SVG container, a layer for the links and a layer for the nodes.
const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", dx)


const gLink = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#964B00")
    .attr("stroke-opacity", 1)
    .attr("stroke-width", 4.5);

const gNode = svg
    .append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

function handleZoom(e) {
    gNode.attr('transform', e.transform);
    gLink.attr('transform', e.transform);
}

let zoom = d3.zoom().on("zoom", handleZoom);
svg.call(zoom);


function update(event, source) {
    console.log(event);
    const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
    const nodes = root.descendants().reverse();
    const links = root.links();

    // Compute the new tree layout.
    tree(root);

    let left = root;
    let right = root;
    root.eachBefore((node) => {
        if (node.y < left.y) left = node;
        if (node.y > right.y) right = node;
    });

    const height = screen.height

    const transition = svg
        .transition()
        .duration(duration)
        .attr("height", height)
        .attr("viewBox", [-screen.width / 3, left.y - marginTop, width, height])
        .tween(
            "resize",
            window.ResizeObserver ? null : () => () => svg.dispatch("toggle")
        );

    // Update the nodes…
    const node = gNode.selectAll("g").data(nodes, (d) => d.id);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d) => {
            d.children = d.children ? null : d._children;
            update(event, d);
        });

    nodeEnter
        .append("ellipse")
        .attr("rx", 10)
        .attr("ry", 5)
        .attr("fill", (d) => (d._children ? "#f00" : "#008000"))
        .attr("stroke-width", 10);

    nodeEnter
        .append("text")
        .attr("dx", "0.31em")
        .attr("y", (d) => (d._children ? -6 : 6))
        .attr("text-anchor", (d) => (d._children ? "end" : "start"))
        .text((d) => d.data.name)
        .clone(true)
        .lower()
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "white");

    // Transition nodes to their new position.
    const nodeUpdate = node
        .merge(nodeEnter)
        .transition(transition)
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node
        .exit()
        .transition(transition)
        .remove()
        .attr("transform", (d) => `translate(${source.x},${source.y})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path").data(links, (d) => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link
        .enter()
        .append("path")
        .attr("d", (d) => {
            const o = {y: source.x0, x: source.y0};
            return diagonal({source: o, target: o});
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link
        .exit()
        .transition(transition)
        .remove()
        .attr("d", (d) => {
            const o = {y: source.x0, x: source.y0};
            return diagonal({source: o, target: o});
        });

    // Stash the old positions for transition.
    root.eachBefore((d) => {
        d.x0 = d.y;
        d.y0 = d.x;
    });
}

// Do the first update to the initial configuration of the tree — where a number of nodes
// are open (arbitrarily selected as the root, plus nodes with 7 letters).
root.x0 = 0;
root.y0 = 0;
root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth) d.children = null;
});

update(null, root);
document.getElementById("tree-container").appendChild(svg.node());

let form = document.getElementById("decision-form");
let currentQuestion = 1;

form.addEventListener("change", function (event) {
    form.requestSubmit()
});

form.addEventListener("submit", function (event) {
    event.preventDefault();

    let formData = new FormData(form);
    let data = Object.fromEntries(formData.entries());
    const questionIds = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"];

    currentQuestion = questionIds.indexOf(Object.keys(data)[0]) + 1;
    changeTree(currentQuestion, currentQuestion + 1, data[data.length -1])

    for (let i = 0; i < questionIds.length - 1; i++) {
        const currentQuestionId = questionIds[i];
        const nextQuestionId = questionIds[i + 1];


        if (currentQuestionId in data) {
            document.getElementById(`${nextQuestionId}-fields`).style.display = "block";
        }
    }

    const lastQuestionId = questionIds[questionIds.length - 1];
    if (lastQuestionId in data) {
        document.getElementById("result-container").style.display = "block";
    }
});
function changeTree(currentQuestionId, nextQuestionId) {
    console.log(currentQuestionId, nextQuestionId)
    update(new PointerEvent('click'), root.children[0]);
}

