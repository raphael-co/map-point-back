# Documentation des Routes des Notifications Push et des Tokens

Cette documentation décrit les différentes routes utilisées pour gérer les tokens de notifications push et envoyer des notifications via Expo.

## Routes pour les Notifications Push

### 1. Ajouter un Token Push

**URL**: `https://map-point.netgraph.fr/api/push/add-token`  
**Méthode**: POST  
**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "ExponentPushToken[...]"
}
```

**Réponse Possible**:

```json
{
    "success": true,
    "tokenId": 1
}
```

---

### 2. Sauvegarder un Token Push pour un Utilisateur

**URL**: `https://map-point.netgraph.fr/api/push/save-token`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "ExponentPushToken[...]"
}
```

**Réponse Possible**:

```json
{
    "success": true
}
```

---

### 3. Envoyer une Notification Push

**URL**: `https://map-point.netgraph.fr/api/push/send-notification`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "title": "Nouvelle Notification",
    "body": "Ceci est une notification"
}
```

**Réponse Possible**:

```json
{
    "success": true,
    "results": [...]
}
```

---

### 4. Envoyer une Notification à Plusieurs Utilisateurs

**URL**: `https://map-point.netgraph.fr/api/push/send-notification-to-users`  
**Méthode**: POST  
**Headers**:  
- Content-Type: application/json

**Corps**:

```json
{
    "title": "Nouvelle Notification",
    "body": "Ceci est une notification",
    "targetUserIds": [1, 2, 3]
}
```

**Réponse Possible**:

```json
{
    "success": true,
    "results": [...]
}
```

---

### 5. Lier un Utilisateur avec un Token Push

**URL**: `https://map-point.netgraph.fr/api/push/link-push-user`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "ExponentPushToken[...]"
}
```

**Réponse Possible**:

```json
{
    "success": true,
    "message": "User linked with token successfully"
}
```

---

### 6. Délier un Utilisateur d'un Token Push

**URL**: `https://map-point.netgraph.fr/api/push/remove-push-link-user`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "token": "ExponentPushToken[...]"
}
```

**Réponse Possible**:

```json
{
    "success": true,
    "message": "User unlinked from token successfully"
}
```

---

## Explications Générales

1. **Ajouter un Token Push** : Cette route permet de sauvegarder un token push dans la base de données. Si le token existe déjà, aucune insertion n'est effectuée.

2. **Sauvegarder un Token pour un Utilisateur** : Cette route permet de lier un utilisateur à un token de notification push, afin que l'utilisateur puisse recevoir des notifications.

3. **Envoyer une Notification** : Cette route envoie une notification push via Expo à un utilisateur spécifique. Le token de notification de l'utilisateur est utilisé pour acheminer la notification.

4. **Envoyer des Notifications à Plusieurs Utilisateurs** : Permet d'envoyer une notification à plusieurs utilisateurs en utilisant leurs tokens respectifs.

5. **Lier un Utilisateur avec un Token** : Cette route permet de lier un utilisateur avec un token push pour qu'il puisse recevoir des notifications.

6. **Délier un Utilisateur d'un Token** : Permet de supprimer le lien entre un utilisateur et un token push, empêchant ainsi l'utilisateur de recevoir des notifications push via ce token.
