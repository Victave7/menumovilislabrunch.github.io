import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
getAuth,
createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const firebaseConfig = {

apiKey: "AIzaSyD5oNK9gFaQN9I7p1hzaAflvdgrNGoNBk",

authDomain: "club-2e4c7.firebaseapp.com",

projectId: "club-2e4c7",

storageBucket: "club-2e4c7.firebasestorage.app",

messagingSenderId: "719625587140",

appId: "1:719625587140:web:f0b0141c8120d580303c91",

measurementId: "G-WZBDR9Y3YZ"

};



const app = initializeApp(firebaseConfig);


const auth = getAuth(app);



const boton = document.getElementById("join");



boton.addEventListener("click", async ()=>{


const nombre = document.getElementById("nombre").value;

const email = document.getElementById("email").value;

const password = document.getElementById("password").value;



if(!nombre || !email || !password){

document.getElementById("mensaje").innerHTML =
"Completa todos los campos";

return;

}



try{


const usuario = await createUserWithEmailAndPassword(
auth,
email,
password
);



document.getElementById("mensaje").innerHTML =
"🌴 Bienvenido al Isla Club " + nombre;



document.getElementById("nombreTarjeta").innerHTML =
nombre;



console.log(usuario);



}catch(error){


document.getElementById("mensaje").innerHTML =
error.message;


}



});
