
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function debugToken() {
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!token) {
        console.error("❌ No FACEBOOK_PAGE_ACCESS_TOKEN found in .env");
        return;
    }

    console.log(`🔍 Debugging Token: ${token.slice(0, 10)}...`);

    try {
        // 1. Check who the token belongs to
        const meRes = await axios.get(`https://graph.facebook.com/me?access_token=${token}`);
        console.log("\n✅ Token Identity (Who is 'me'?):");
        console.log(`   Name: ${meRes.data.name}`);
        console.log(`   ID:   ${meRes.data.id} (Should match Page ID: ${pageId})`);

        // 2. Check Token Scopes using debug_token
        const appToken = `${appId}|${appSecret}`;

        console.log(`\n🔍 Checking Token Scopes via debug_token...`);

        const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
            params: {
                input_token: token,
                access_token: appToken
            }
        });

        const data = debugRes.data.data;
        console.log(`\n✅ Token Debug Data:`);
        console.log(`   Valid:       ${data.is_valid}`);
        console.log(`   Type:        ${data.type}`); // Should be PAGE

        // Check for essential scopes
        const requiredScopes = ["pages_manage_posts", "pages_read_engagement", "public_profile"];
        const missingScopes = requiredScopes.filter(scope => !data.scopes.includes(scope));

        if (missingScopes.length > 0) {
            console.error(`\n❌ CRITICAL ERROR: Token is missing required scopes: ${missingScopes.join(", ")}`);
            return;
        }

        console.log("\n✅ All required permissions are PRESENT.");

        // 3. If Identity Mismatch, Try to Get Page Token
        if (meRes.data.id !== pageId) {
            console.log("\n🔄 Mismatch detected! (User Token vs Page ID)");
            console.log("   Attempting to fetch Page Access Token using this User Token...");
            try {
                const pageRes = await axios.get(
                    `https://graph.facebook.com/${pageId}?fields=access_token,name&access_token=${token}`
                );

                console.log("\n🎉 SUCCESS! Found the Page Access Token:");
                console.log(`   Page Name: ${pageRes.data.name}`);
                console.log(`\nvvvvvvvv COPY THIS TOKEN vvvvvvvv\n`);
                console.log(pageRes.data.access_token);
                console.log(`\n^^^^^^^^ COPY THIS TOKEN ^^^^^^^^\n`);
                console.log("👉 Replace FACEBOOK_PAGE_ACCESS_TOKEN in your .env with this new token.");

            } catch (pageErr) {
                console.error("\n❌ Failed to fetch Page Token. Ensure the System User is added to the Page in Business Manager.");
                console.error(`   Error: ${pageErr.message}`);
                if (pageErr.response) console.error(`   Data: ${JSON.stringify(pageErr.response.data)}`);
            }
        } else {
            console.log("\n✅ Token ID matches Page ID. This IS a valid Page Token.");
        }

    } catch (err) {
        console.error("\n❌ API Request Failed:");
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
            console.error(`   Data:`, JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(`   Error: ${err.message}`);
        }
    }
}

debugToken();
