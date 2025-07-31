import mongoose from "mongoose";
 
 const postSchema = new mongoose.Schema({
    user: {
        type : mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    date:{
        type:Date,
        default:Date.now

    },
    content:String,
    likes:[
        {type: mongoose.Schema.Types.ObjectId, ref:"user"}
    ]
        
})
const user = mongoose.model('post',postSchema)
export default user;