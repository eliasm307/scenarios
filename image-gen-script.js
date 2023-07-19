const { HfInference } = require("@huggingface/inference");
const fs = require("fs");

const HF_ACCESS_TOKEN = "";

(async () => {
  const inference = new HfInference(HF_ACCESS_TOKEN);

  // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
  const result = await inference.textToImage(
    {
      // model: "stabilityai/stable-diffusion-xl-base-0.9",
      model: "stabilityai/stable-diffusion-2-1",
      inputs:
        "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
      parameters: {
        negative_prompt: "blurry",
      },
    },
    {},
  );

  console.log("prompt result", result);

  const buffer = Buffer.from(await result.arrayBuffer());
  await new Promise((resolve, reject) => {
    fs.createWriteStream("output.jpeg").write(buffer, (error) => {
      if (error) {
        console.error("error saving jpeg", error);
        reject(error);
        return;
      }
      console.log("jpeg saved!", error);
      resolve();
    });
  });
  debugger;
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then((result) => {
    console.log(result);
    process.exit(0);
  });
