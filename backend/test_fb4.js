import { config } from "dotenv";
config();
import { postToFacebook } from "./services/postToFacebook.js";

async function run() {
    try {
        const res = await postToFacebook({
            imageUrls: ["https://picsum.photos/400/300"],
            caption: "Final backend verification test for Facebook posting!"
        });
        console.log("Success:", res);
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
run();
