/* eslint-disable no-console */
import { HfInference } from "@huggingface/inference";
import fs from "fs";
import path from "path";

console.log("starting image gen demo");

void (async () => {
  const inference = new HfInference();

  const timerKey = "image-gen-demo";
  console.time(timerKey);
  // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
  const result = await inference.textToImage(
    {
      model: "stabilityai/stable-diffusion-2-1",
      // model: "stabilityai/stable-diffusion-xl-base-1.0", // ! too slow, 2+ minutes
      // model: "stabilityai/stable-diffusion-xl-refiner-1.0", // doesn't work
      // inputs:
      //   "Intriguing, high-resolution image of a middle-aged musician against an array of digital screens illuminating his weary face. On one screen is an advanced AI entity generating mesmerizing music compositions based on his works. Around him are symbols of a waning career and looming struggle: a neglected guitar, dwindling concert tickets, and unopened bills. The two worlds contrasting, coaxing conversation on both traditional music creation methods vs Ai generated compositions and raising privacy concerns around cloud storage. Featured on popular technology and music artist platforms alike.",
      inputs: "A sad ballerina dancing in the rain",
      // "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
      parameters: {
        negative_prompt: "blurry",
      },
    },
    {
      use_cache: false,
      retry_on_error: true,
      wait_for_model: true,
    },
  );
  console.timeEnd(timerKey);

  console.log("prompt result", result);

  const buffer = Buffer.from(await result.arrayBuffer());
  const outputPath = path.join(__dirname, "output.jpeg"); // ! this is relative to the build dir, not the src dir
  await new Promise<void>((resolve, reject) => {
    fs.createWriteStream(outputPath).write(buffer, (error) => {
      if (error) {
        console.error("error saving jpeg", error);
        reject(error);
        return;
      }
      console.log("jpeg saved!", outputPath, error);
      resolve();
    });
  });
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((result) => {
    console.log(result);
    process.exit(0);
  });
