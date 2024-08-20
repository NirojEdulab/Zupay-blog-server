import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find({}).sort({
      createdAt: -1,
    });
    res.json({
      status: 200,
      message: "All posts",
      data: posts,
    });
  } catch (error) {
    console.log("Error while getAllPosts: ", error);
  }
};

const getSinglePost = async (req, res) => {
  try {
    console.log("getSinglePost ==>> ", req.params.id);
    const postId = req.params.id;
    const postData = await Post.findOne({
      _id: postId,
    });

    if (!postData) {
      res.json({
        status: 404,
        message: "Post not found",
        data: [],
      });
      return;
    }

    await res.json({
      status: 200,
      message: "Post fetched successfully",
      data: postData,
    });
  } catch (error) {
    console.log("Error while getSinglePost: ", error);
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content, userId } = req.body;
    if ([title, content, userId].some((field) => field?.trim() === "")) {
      res.json({
        status: 400,
        message: "All fields are required.",
      });
      return;
    }

    const autherData = await User.findById({
      _id: userId,
    });

    if (!autherData) {
      res.json({
        status: 400,
        message: "Something went wrong...",
      });
      return;
    }

    const postImageLocalPath = req.files?.image[0]?.path;
    const postImage = await uploadOnCloudinary(postImageLocalPath);

    const post = await Post.create({
      title,
      content,
      author: autherData,
      image: postImage?.url || "",
    });

    const createdPost = await Post.findById(post._id);

    if (!createdPost) {
      res.json({
        status: 400,
        message: "Something Went Wrong while creating post!!! Please try later",
      });
      return;
    }

    res.json({
      status: 200,
      message: "Post successfully created.",
      data: createdPost,
    });
  } catch (error) {
    console.log("Error while createPost: ", error);
  }
};

const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, content } = req.body;
    const image = req.files;

    if (!title && !content && !image) {
      res.json({
        status: 200,
        message: "No changes made.",
      });
      return;
    }

    const post = await Post.findById({
      _id: postId,
    });

    if (!post) {
      res.json({
        status: 404,
        message: "Post not found",
        data: [],
      });
      return;
    }

    if (!req.user._id.equals(post.author)) {
      res.json({
        status: 403,
        message: "Sorry! You can't change the post.",
        data: [],
      });
      return;
    }

    if (image[0]?.path) {
      const imageLocalPath = image[0]?.path;
      const updatedImage = await uploadOnCloudinary(imageLocalPath);
      if (updatedImage.url) {
        post.image = updatedImage.url;
      }
    }

    if (title) post.title = title;
    if (content) post.content = content;

    const updatedPost = await post.save();
    res.json({
      status: 200,
      message: "Post updated successfully",
      data: updatedPost,
    });
  } catch (error) {
    console.log("Error while updatePost: ", error);
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById({
      _id: postId,
    });

    if (!post) {
      res.json({
        status: 404,
        message: "Post not found",
      });
      return;
    }

    // Extract the public ID from the Cloudinary URL
    const imageUrl = post.image;
    const imagePublicId = imageUrl
      ? imageUrl.split("/").slice(-1)[0].split(".")[0]
      : null;

    await Post.deleteOne({
      _id: postId,
    });

    // Delete the image from Cloudinary
    if (imagePublicId) {
      await cloudinary.uploader.destroy(imagePublicId, (error, result) => {
        if (error) {
          console.log("Error while deleting image from Cloudinary: ", error);
        } else {
          console.log("Image deleted from Cloudinary: ", result);
        }
      });
    }

    res.json({
      status: 200,
      message: "Post deleted successfully...",
    });
  } catch (error) {
    console.log("Error while deletePost: ", error);
  }
};

export { getAllPosts, getSinglePost, createPost, updatePost, deletePost };
