console.log("ISLA CLUB APP FUNCIONANDO");


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

appId: "1:719625587140:web:f0b0141c8120d580303c91"

};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


document.getElementById("join").onclick = async function(){


console.log("BOTON FUNCIONA");


let email = document.getElementById("email").value;

let password = document.getElementById("password").value;


console.log(email,password);



try {


await createUserWithEmailAndPassword(
auth,
email,
password
);


alert("Usuario creado correctamente 🌴");


}


catch(error){


console.log(error);

alert(error.message);


}


}
