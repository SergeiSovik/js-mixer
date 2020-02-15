/*
 * Copyright 2000-2020 Sergio Rando <segio.rando@yahoo.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import { Sound } from "./sound.js";

/** @typedef {Object<string, Sound>} SoundList */ var SoundList;

export class Mixer {
	/** @param {HTMLElement} domContainer */
	constructor(domContainer) {
		this.domContainer = domContainer;

		this.fMixerVolume = 1.0;
		this.fMixerMaxVolume = 1.0;
	
		/** @type {SoundList} */ this.dictSounds = {};
		/** @type {SoundList} */ this.dictSoundFx = {};
	
	}

	/** @param {HTMLAudioElement} domAudio */
	register(domAudio) {
		this.domContainer.appendChild(domAudio);
	}

	/** @param {HTMLAudioElement} domAudio */
	unregister(domAudio) {
		if (this.domContainer.contains(domAudio))
			this.domContainer.removeChild(domAudio);
	}

	/**
		* @param {string} sKey 
		* @returns {Sound}
		*/
	get(sKey) {
		return this.dictSounds[sKey] || null;
	}

	/** @param {string} sKey */
	remove(sKey) {
		if (this.dictSounds[sKey] !== undefined)
			this.dictSounds[sKey].release();
	}

	/**
		* @param {string} sKey 
		* @param {HTMLAudioElement} domAudio 
		* @return {Sound}
		*/
	createSound(sKey, domAudio) {
		if (this.dictSounds[sKey] !== undefined)
			this.dictSounds[sKey].release();

		this.dictSounds[sKey] = new Sound(sKey, this, domAudio);
		return this.dictSounds[sKey];
	}

	/**
		* @param {number} fVolume 
		* @param {number} fMaxVolume 
		*/
	setMaxVolume(fVolume, fMaxVolume) {
		this.fMixerVolume = (fVolume < 0) ? 1 : fVolume;
		this.fMixerMaxVolume = (fMaxVolume < 0) ? 1 : fMaxVolume;

		for (let sKey in this.dictSounds) {
			let oSound = this.dictSounds[sKey];
			oSound.bInvalid = true;
			oSound.update();
		}
	}

	update() {
		for (let sKey in this.dictSoundFx)
			this.dictSoundFx[sKey].oVolumeFx.update();
	}

	stop() {
		for (var sKey in this.dictSounds)
			this.dictSounds[sKey].stop();
	}

	release() {
		for (var sKey in this.dictSounds)
			this.dictSounds[sKey].release();

		this.dictSounds = {};
		this.dictSoundFx = {};
	}
}
