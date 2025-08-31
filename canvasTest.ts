import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";

const canvasWidth = 600;
const canvasHeight =  200;

const canvas = createCanvas(canvasWidth, canvasHeight);
const context = canvas.getContext("2d");

context.fillStyle = "#0099ff";
context.fillRect(0, 0, canvas.width, canvas.height);

// Background
const backgroundImage = await loadImage("src/media/canvas/istockphoto-2162211599-612x612-edited.jpg");
context.drawImage(backgroundImage, 0, -150, 650, 650);

// Our logo
const logo = await loadImage("https://placehold.co/150x150");
context.drawImage(logo, 50, 25, 150, 150);

// Name (like profile)
context.font = "bold 25px Sans";
context.fillStyle = "#ffffff";
context.fillText("RC Garage Herinnering\n", 240, 45);

// Values
context.font = "20px Sans";
context.fillStyle = "#ffffff";
context.fillText("TheGhostOfChaos is nu level 14!", 240, 75);

// XP
context.font = "20px Sans";
context.fillStyle = "#ffffff";
context.fillText("XP", 240, 115);

context.font = "20px Sans";
context.fillStyle = "#ffffff";
context.fillText("9810", 240, 145);

// RANG
context.font = "20px Sans";
context.fillStyle = "#ffffff";
context.fillText("Nieuwe rang", 380, 115);

context.font = "20px Sans";
context.fillStyle = "#ffffff";
context.fillText("15", 380, 145);


// Save for development
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("./output.png", buffer);

console.log("Yeeet");