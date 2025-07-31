import mongoose from "mongoose";
 
 const userSchema = new mongoose.Schema({
    username:String,
    name:String,
    age:Number,
    email:String,
    password:String,
    posts:[
        {type : mongoose.Schema.Types.ObjectId, ref :"post"}]

        
})
const user = mongoose.model('user',userSchema)
export default user;