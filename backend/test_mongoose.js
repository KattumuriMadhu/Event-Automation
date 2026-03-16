import mongoose from "mongoose";

const schema = new mongoose.Schema({
  dates: [Date]
});
const Model = mongoose.model("TestDates", schema);

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/test_db");
  // insert a doc bypassing schema
  const col = mongoose.connection.collection("testdates");
  await col.insertOne({ dates: new Date() });
  
  const doc = await Model.findOne();
  console.log("dates is array?", Array.isArray(doc.dates), doc.dates);
  
  await mongoose.disconnect();
}
run();
