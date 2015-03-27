All user exposed API is presented in the mdaf.js file;

The application logic of the server, which should be described by the programmer is in the app.js file.

Session manager sets the authentication and synchronization strategies, creates the sessions, sets basic listeners for each new connection.

Device Manager - registers the devices, and device groups.

mdaf.js and longTermSession.js are event emitters. Developer cooperates with the framework via events.

Client part of the application is concealed, because of privacy policy. The framework's part of the client is presented in the client 1 directory. Slight modifications on COMMIT client code were performed