const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '../../data/modalInputs.json');

class ModalStorage {
    constructor() {
        this.data = {};
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(STORAGE_FILE)) {
                const rawData = fs.readFileSync(STORAGE_FILE, 'utf8');
                this.data = JSON.parse(rawData);
            }
        } catch (error) {
            console.error('Error loading modal storage:', error);
            this.data = {};
        }
    }

    saveData() {
        try {
            const dir = path.dirname(STORAGE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving modal storage:', error);
        }
    }

    getLastInput(userId, modalType) {
        const key = `${userId}_${modalType}`;
        return this.data[key] || '';
    }

    saveLastInput(userId, modalType, input) {
        const key = `${userId}_${modalType}`;
        this.data[key] = input;
        this.saveData();
    }
}

module.exports = new ModalStorage();