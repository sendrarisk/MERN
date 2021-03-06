import { createStore, applyMiddleware, combineReducers } from 'redux';
import citiesReducer from './reducers/cityReducer';
import itinerariesReducer from './reducers/itinerariesReducers';
import activitiesReducer from './reducers/activitiesReducer';
import loginReducer from './reducers/loginReducer';
import registerReducer from './reducers/registerReducer';
import commentsReducer from './reducers/commentsReducer';

import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';

//
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage web

const middlewares = [thunk];

const reducers = combineReducers({
  citiesReducer,
  itinerariesReducer,
  activitiesReducer,
  loginReducer,
  registerReducer,
  commentsReducer
});

const persistConfig = {
  key: 'root',
  storage
};

const persistedReducer = persistReducer(persistConfig, reducers);

let store = createStore(
  persistedReducer,
  composeWithDevTools(applyMiddleware(...middlewares))
);
export let persistor = persistStore(store);

export default store;
