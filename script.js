'use strict';

// prettier-ignore


class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in minutes
        
    }

    _setDescription() {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = "running";

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
        return this.pace
    }
}

class Cycling extends Workout {
    type = "cycling";

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
        return this.speed
    }
}


// console.log(run1, cycling1);

//////////////////////////////////////////////////////////////////
// application architecture

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const formEdit = document.querySelector(".form__edit");
const inputTypeEd = document.querySelector('.form__ed__input--type');
const inputDistanceEd = document.querySelector('.form__ed__input--distance');
const inputDurationEd = document.querySelector('.form__ed__input--duration');
const inputCadenceEd = document.querySelector('.form__ed__input--cadence');
const inputElevationEd = document.querySelector('.form__ed__input--elevation');

const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const btnCloseModal = document.querySelector('.close-modal');

let btnEdit, btnDelete, currEditId;


class App {
    #map;
    #mapEvent;
    #workouts = [];
    

    constructor() {
        this._getPosition(); 
        // this._getPosition() vola metodu _getPosition, ktora zavola getCurrentPosition, ktora (ak sa ??spe??ne na????taju suradnice u??ivatela) zavola _loadMap
        // _loadMap dostane ako argument objekt obsahujuci okrem ineho suradnice u??ivatela podla ktorych vykresli mapu jeho pribli??nej polohy
        // _loadMap taktie?? obsahuje event handler ktory sa star?? o clicky na mapu, ktory vracia objekt s informaciami o evente - suradnice clicku atd
        // tento event handler obsahuje callback _showForm, ktoreho argumentom je prave spominany objekt, tento objekt s datami o suradniciach clicku sa uklada do #mapEvent
        // metoda _newWorkout potom vyu????va tieto data z #mapEvent, aby na pr??slu??nom mieste vykreslila marker
        // _toggleElevationField prep??na cadence/elev gain podla zmeny formu

        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this)) ;
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
        // console.log(this.#mapEvent);

        // console.log(this.#workouts);
        // console.log(this.#workouts.indexOf(this.#workouts.find(e => e.id === "1217363828")));

        formEdit.addEventListener("submit", this._editWorkoutSubmit.bind(this));
        inputTypeEd.addEventListener("change", this._toggleElevationFieldEd);
        btnCloseModal.addEventListener("click", this._closeModal);
        overlay.addEventListener("click", this._closeModal);
        document.addEventListener('keydown', this._closeModalEsc.bind(this));

    }

    _getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            
        function() {
            alert("Could not get your position")
        });        
        };
    }

    _loadMap(position) {
        // console.log(position);
        const {latitude} = position.coords;
        const {longitude} = position.coords;
    
        const coords = [latitude, longitude];
        // console.log(`https://www.google.cz/maps/@${latitude},${longitude}`);
        this.#map = L.map('map').setView(coords, 13);
        // console.log(map);
    
         L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        
        // handling clicks on map
        this.#map.on("click", this._showForm.bind(this));
        
        // markery musime na????tat z pamate a?? tu, preto??e prvi prvom spusten?? chv??lu trv??, k??m sa mapa na????ta
        // tak??e v tej dobe e??te nie je mo??n?? na????tat marker na mape
        // preto ho na????tavame a?? po naloadovan?? mapy
        this.#workouts.forEach(e => {
            this._renderWorkoutMarker(e);
            
        });
    }

    _showForm(mapE) {
        // console.log(mapE)
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        // empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(() => (form.style.display = "grid"), 1000)
    }

    _hideFormEd() {
        inputDistanceEd.value = inputDurationEd.value = inputCadenceEd.value = inputElevationEd.value = "";
        
        formEdit.style.display = "none";
        formEdit.classList.add("hidden");
        setTimeout(() => (formEdit.style.display = "grid"), 1000)
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _toggleElevationFieldEd() {
        if(inputTypeEd.value === "cycling") {
            inputElevationEd.closest(".form__row").classList.remove("form__row--hidden");
            inputCadenceEd.closest(".form__row").classList.add("form__row--hidden");
        }

        if(inputTypeEd.value === "running") {
            inputCadenceEd.closest(".form__row").classList.remove("form__row--hidden");
            inputElevationEd.closest(".form__row").classList.add("form__row--hidden");       
        }
    }

    _switchingElevCadeFieldEd() {
        if(inputTypeEd.value === "cycling") {
            inputElevationEd.closest(".form__row").classList.remove("form__row--hidden");
            inputCadenceEd.closest(".form__row").classList.add("form__row--hidden");
            
        }

        if(inputTypeEd.value === "running") {
            inputCadenceEd.closest(".form__row").classList.remove("form__row--hidden");
            inputElevationEd.closest(".form__row").classList.add("form__row--hidden");
            
        }
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(e => Number.isFinite(e));
        const allPositive = (...inputs) => inputs.every(e => e > 0);

        e.preventDefault();

        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        // console.log(this.#mapEvent);
        let workout;
        
        // check if data is valid

        // if activity running, create running object, if activity cycling, create cycling object
        if(type === "running") {
            const cadence = +inputCadence.value;
            if(
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
                ) 
                return this._openModal()

            workout = new Running([lat, lng], distance, duration, cadence);
            
        }

        if(type === "cycling") {
            const elevation = +inputElevation.value;

            if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return this._openModal()

                workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // add new object to the workout array
        this.#workouts.push(workout);
        // console.log(workout);

        // render workout on map as marker
        this._renderWorkoutMarker(workout)

        // render workout on list
        this._renderWorkout(workout);
        
        // clear inpuit fields + hide form
        this._hideForm();

        // set local storage to all workouts
        this._setLocalStorage();


    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`,

    }))
    .setPopupContent(`${workout.type === "running" ? "?????????????" : "?????????????"} ${workout.description}`)
    .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === "running" ? "?????????????" : "?????????????"}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">???</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        `;
        if(workout.type === "running")
            html += `
            <div class="workout__details">
                <span class="workout__icon">??????</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
                <span class="workout__icon">????????</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
          </div>
                <button class="workout__btn btn_edit">Edit</button>
                <button class="workout__btn btn_delete">Delete</button>
        </li>
            `
        if(workout.type === "cycling")
            html += `
            <div class="workout__details">
                <span class="workout__icon">??????</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
                <span class="workout__icon">???</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
          </div>
                <button class="workout__btn btn_edit">Edit</button>
                <button class="workout__btn btn_delete">Delete</button>
        </li>
            `;

        formEdit.insertAdjacentHTML("afterend", html);

        btnEdit = document.querySelector(".btn_edit"); 
        btnDelete = document.querySelector(".btn_delete");

        btnEdit.addEventListener("click", this._editWorkout.bind(this));
        btnDelete.addEventListener("click", this._deleteWorkout.bind(this));

    }
    _moveToPopup(e) {
        const workoutEl = e.target.closest(".workout");

        if(!workoutEl) return;

        const workout = this.#workouts.find(e => e.id === workoutEl.dataset.id);
        

        this.#map.setView(workout.coords, 13, {
            animate: true,
            pan: {
                duration: 1,
            }
        });

    }

    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));

        if(!data) return;
        this.#workouts = data;

        this.#workouts.forEach(e => {
            this._renderWorkout(e);
            
        });
    }

    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    } 

    _editWorkout(e) {
        const workoutEl = e.target.closest(".workout");
        const workoutId = workoutEl.getAttribute("data-id");
        currEditId = workoutId;
        const workoutObj = this.#workouts.find(e => e.id === workoutId);

        // skryt form (mo??e byt otvoreny)
        this._hideForm();

        // otvorit form, na????tat donho stare hodnoty, u????vatel uprav??
        formEdit.classList.remove("hidden");
        inputTypeEd.value = `${workoutObj.type}`;
        inputDistanceEd.value = `${workoutObj.distance}`;
        inputDurationEd.value = `${workoutObj.duration}`;
        workoutObj.type === "running" ? inputCadenceEd.value = `${workoutObj.cadence}` : inputElevationEd.value = `${workoutObj.elevationGain}`;
        inputDistanceEd.focus();

        // zmena cadence/elev fieldu
        this._switchingElevCadeFieldEd();

        // vymazat povodny workout

        // this._deleteWorkout();

        // spusit _newWorkout s novymi hodnotami

        console.log("trying to edit workout..");
        // console.log(currEditId);
    }

    _editWorkoutSubmit(e) {
        const validInputs = (...inputs) => inputs.every(e => Number.isFinite(e));
        const allPositive = (...inputs) => inputs.every(e => e > 0);

        e.preventDefault();

        // get data from form
        const type = inputTypeEd.value;
        const distance = +inputDistanceEd.value;
        const duration = +inputDurationEd.value;

        // zistit index objektu v array #workouts
        let workoutIndex = this.#workouts.indexOf(this.#workouts.find(e => e.id === String(currEditId)));
        let [lat, lng] = this.#workouts[workoutIndex].coords;
        let workout;

        // upravovanie properties objektov za predpokladu ??e sa nemen?? type
        if(type === "running" && this.#workouts[workoutIndex].type === "running") {
            const cadence = +inputCadenceEd.value;
            if(
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
                ) 
                return this._openModal()

            // upravit data v objekte
                this.#workouts[workoutIndex].type = type;
                this.#workouts[workoutIndex].distance = distance;
                this.#workouts[workoutIndex].duration = duration;
                this.#workouts[workoutIndex].cadence = cadence;

        this._renderWorkoutMarker(this.#workouts[workoutIndex])
        this._renderWorkout(this.#workouts[workoutIndex]);
        }

        if(type === "cycling" && this.#workouts[workoutIndex].type === "cycling") {
            const elevation = +inputElevationEd.value;

            if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return this._openModal()

                // upravit data v objekte
                this.#workouts[workoutIndex].type = type;
                this.#workouts[workoutIndex].distance = distance;
                this.#workouts[workoutIndex].duration = duration;
                this.#workouts[workoutIndex].elevationGain = elevation;

        this._renderWorkoutMarker(this.#workouts[workoutIndex])
        this._renderWorkout(this.#workouts[workoutIndex]);

        }
        // zmena typu workoutu - nutn?? vymazat povodny workout a zalo??i?? nov?? so spr??vnym typom
        if(type === "running" && this.#workouts[workoutIndex].type === "cycling") {
            this.#workouts.splice(workoutIndex, 1);

            const cadence = +inputCadenceEd.value;
            if(
                !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)
                ) 
                return alert("Inputs have to be positive numbers!")

            workout = new Running([lat, lng], distance, duration, cadence);

            this.#workouts.push(workout);
            this._renderWorkoutMarker(workout)
            this._renderWorkout(workout);
        }

        if(type === "cycling" && this.#workouts[workoutIndex].type === "running") {
            this.#workouts.splice(workoutIndex, 1);

            const elevation = +inputElevation.value;

            if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration))
                return alert("Inputs have to be positive numbers!")

            workout = new Cycling([lat, lng], distance, duration, elevation);

            this.#workouts.push(workout);
            this._renderWorkoutMarker(workout)
            this._renderWorkout(workout);
            
        }
        
        this._hideFormEd();
        localStorage.removeItem("workouts");
        this._setLocalStorage();
        location.reload();
    }

    _deleteWorkout(e) {
        const workoutEl = e.target.closest(".workout");
        const workoutId = workoutEl.getAttribute("data-id");
        this.reset();
        this.#workouts.splice(this.#workouts.indexOf(this.#workouts.find(e => e.id === `${workoutId}`)), 1);
        this._setLocalStorage();

    }

    _openModal() {
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
    }

    _closeModal() {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');
    }

    _closeModalEsc(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            this._closeModal();
            }
          
    }
};


const app = new App();























