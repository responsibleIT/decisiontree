import "./style.css";
import data from "./data.json";
import * as d3 from "d3";

const chart = () => {
  // Specify the charts’ dimensions. The height is variable, depending on the layout.
  const width = 928;
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 10;
  const marginLeft = 40;

  // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
  // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
  // “bottom”, in the data domain. The width of a column is based on the tree’s height.
  const root = d3.hierarchy(data);
  const dx = 200;
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
    .attr("viewBox", [-marginLeft, -marginTop, width, dy])
    .attr(
      "style",
      "max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;"
    );

  const gLink = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", "#f00")
    .attr("stroke-opacity", 1)
    .attr("stroke-width", 4.5);

  const gNode = svg
    .append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  function update(event, source) {
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

    const height = right.y - left.y + marginTop + marginBottom;

    const transition = svg
      .transition()
      .duration(duration)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, left.y - marginTop, width, height])
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
      .attr("transform", (d) => `translate(${source.x0},${source.y0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        d.children = d.children ? null : d._children;
        update(event, d);
      });

    nodeEnter
      .append("circle")
      .attr("r", 2.5)
      .attr("fill", (d) => (d._children ? "#555" : "#999"))
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
        const o = { y: source.x0, x: source.y0 };
        return diagonal({ source: o, target: o });
      });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link
      .exit()
      .transition(transition)
      .remove()
      .attr("d", (d) => {
        const o = { y: source.x, x: source.y };
        return diagonal({ source: o, target: o });
      });

    // Stash the old positions for transition.
    root.eachBefore((d) => {
      d.x0 = d.y;
      d.y0 = d.x;
    });
  }

  // Do the first update to the initial configuration of the tree — where a number of nodes
  // are open (arbitrarily selected as the root, plus nodes with 7 letters).
  root.x0 = dx / 2;
  root.y0 = 0;
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    if (d.depth && d.data.name.length !== 7) d.children = null;
  });

  update(null, root);

  return svg.node();
};

const treeContainer = document.querySelector("#tree-container");

treeContainer.appendChild(chart());

// document.querySelector("#tree-container").appendChild = chart();
