import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


window.registrar = async function(){

  const nombre = document.getElementById("nombre").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const usuario = userCredential.user;

    await setDoc(doc(db,"clientes",usuario.uid),{
      nombre:nombre,
      email:email,
      visitas:0,
      premios:0,
      creado:new Date()
    });


    alert("Bienvenido al Isla Club 🌴");

  } catch(error){

    alert(error.message);

  }

};


window.login = async function(){

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;


  try{

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    alert("Bienvenido de nuevo 🌴");

  }catch(error){

    alert(error.message);

  }

};