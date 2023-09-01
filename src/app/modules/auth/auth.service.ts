/* eslint-disable @typescript-eslint/no-non-null-assertion */
import httpStatus from "http-status"
import { Secret } from "jsonwebtoken"
import config from "../../../config"
import ApiError from "../../../errors/ApiError"

import bcrypt from 'bcrypt'
import { jwthelper } from "../../../helpers/jwtHelpers"
import prisma from "../../../shared/prisma"

const createAuthUser = async (data:any) => {
  if (data?.password) {
    const hashedPassword = await bcrypt.hash(data?.password, Number(config.bycrypt_salt_rounds));
    data.password = hashedPassword;
  }

  const result = await prisma.user.create({
    data,
    include: {
      orders: true,
      reviews: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong');
  }

  let accessToken;
  let refreshToken;

  if (result) {
    const isUserExist = await prisma.user.findUnique({
      where: {
        email: data?.email,
      },
    });

    if (isUserExist) {
      accessToken = jwthelper.createToken(
        { userId: isUserExist.id, email: isUserExist.email, role: isUserExist.role },
        config.jwt.secret as Secret,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
        }
      );

      refreshToken = jwthelper.createToken(
        { userId: isUserExist.id, email: isUserExist.email, role: isUserExist.role },
        config.jwt.secret as Secret,
        {
          expiresIn: config.jwt.refresh_expires_in,
        }
      );
    }
  }

  return { data: result, accessToken, refreshToken };
};



  const loginuser = async(data:any):Promise<any>=>{
    const {email,password} =  data
    const isUserExist =  await prisma.user.findUnique({
        where:{
            email:email
        }
    })
    if(!isUserExist){
        throw new ApiError(httpStatus.BAD_REQUEST,"user not exist")

    }

    const decriptedPassword  = await bcrypt.compare(password,isUserExist.password)

        if(isUserExist?.password && !decriptedPassword){
            throw new ApiError(httpStatus.BAD_REQUEST,"password is incorrect")
        }
        const accessToken = jwthelper.createToken(
          {userId:isUserExist?.id,email:isUserExist?.email,role:isUserExist?.role},
          config.jwt.secret as Secret,
          {
            expiresIn: process.env.JWT_EXPIRES_IN,
          }
        )
      
        const refreshToken = jwthelper.createToken(
          {userId:isUserExist?.id,email:isUserExist?.email,role:isUserExist?.role},
          config.jwt.secret as Secret,
          {
            expiresIn: config.jwt.refresh_expires_in,
          }
        )
        return {
          accessToken,
          refreshToken,
        }
  }

  const refreshToken = async (token: string) => {
    let verifyToken = null
    try {
      verifyToken = jwthelper.verifyToken(
        token,
        config.jwt.refresh_secret as Secret
      )
    } catch (error) {
      throw new ApiError(404, 'invalid token')
    }
    // step 2 cheek if user exists or not

    const isUserExist =  await prisma.user.findUnique({
      where:{
          email:verifyToken?.email
      }
  })
  if(!isUserExist){
      throw new ApiError(httpStatus.BAD_REQUEST,"user not exist")

  }
   
    // const { email } = isUserExist
 
  

    // step 3 generate new token
    const accessToken = jwthelper.createToken(
      {id:isUserExist?.id,email:isUserExist?.email,role:isUserExist?.role},
      config.jwt.secret as Secret,
      {
        expiresIn: config.jwt.expires_in,
      }
    )
    return {
      accessToken,
    }
  }

  const authservices = {
    createAuthUser,
    loginuser,
    refreshToken
    
  }
  export default authservices