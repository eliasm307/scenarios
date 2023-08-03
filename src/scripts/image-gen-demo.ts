/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { HfInference } from "@huggingface/inference";

console.log("starting image gen demo");

void (async () => {
  const inference = new HfInference();

  const timerKey = "image-gen-demo";
  console.time(timerKey);
  // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
  const result = await inference.textToImage(
    {
      // model: "stabilityai/stable-diffusion-2-1",
      model: "prompthero/openjourney-v4",
      // model: "stabilityai/stable-diffusion-xl-base-1.0", // ! too slow, 2+ minutes
      // model: "stabilityai/stable-diffusion-xl-refiner-1.0", // doesn't work
      inputs: `high resolution photography interior design, interior design magazine, minimalist design, cosy atmosphere, open plan, mission style home, design kitchen room, modular black and brown furnitures, wooden floor, brick walls, high ceiling, large steel windows with a city view, skyline in the background, warehouse style, industrial style
      `,
      // "Intriguing, high-resolution image of a middle-aged musician against an array of digital screens illuminating his weary face. On one screen is an advanced AI entity generating mesmerizing music compositions based on his works. Around him are symbols of a waning career and looming struggle: a neglected guitar, dwindling concert tickets, and unopened bills. The two worlds contrasting, coaxing conversation on both traditional music creation methods vs Ai generated compositions and raising privacy concerns around cloud storage. Featured on popular technology and music artist platforms alike.",
      // inputs: "A sad ballerina dancing in the rain",
      // "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
      parameters: {
        negative_prompt: `(costume), (((wide shot))), (cropped head), (long neck), bad framing, out of frame, deformed, cripple, old, fat, ugly, poor, missing arm, additional arms, additional legs, additional head, additional face, multiple faces, multiple heads, multiple people, group of people, dyed hair, black and white, grayscale, watermark, dreamlikeart, 3d render of futuristic military cyborg, cyberpunk, wolf, warframe, stealth, armored, neon lights, background explosion, character design, hard surface, smooth, detailed face, highly detailed, intricate details, symmetrical, volumetric lighting, ambient light, real-time, vfx, digital 3d, uhd, hdr, <by bad-artist:0.7>, <ng_deepnegative_v1_75t:0.7>, <EasyNegative:0.7>" ,<bad_prompt:0.7>, <badhandv4:0.7>, <by bad-artist-anime:0.7>, disfigured, kitsch, ugly, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, old, surreal, text, blurry, b&w, monochrome, conjoined twins, multiple heads, extra legs, extra arms, fashion photos (collage:1.25), meme, elongated, twisted, fingers, strabismus, heterochromia, closed eyes, blurred, watermark, lowres, error, cropped, worst quality, low quality, jpeg artifacts, out of frame, signature, face cut, head cut, extra fingers, bad proportions, cropped head, malformed limbs, mutated hands, fused fingers`,
        height: 1024,
        width: 1024,
        num_inference_steps: 20,
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
