# Documentation des Routes des Marqueurs

Cette documentation décrit les différentes routes utilisées pour gérer les marqueurs sur la plateforme MapPoint. Les routes permettent de créer, mettre à jour, supprimer des marqueurs, ainsi que de gérer les labels associés aux marqueurs.

## Routes pour les Marqueurs

### 1. Créer un Marqueur

**URL**: `https://map-point.netgraph.fr/api/marker/create`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: multipart/form-data

**Corps** (FormData):
- title: Titre du marqueur (string)
- description: Description du marqueur (string, optionnel)
- latitude: Latitude du marqueur (string)
- longitude: Longitude du marqueur (string)
- type: Type du marqueur (string)  
  *Exemples*: "park", "restaurant", "bar", etc.
- visibility: Visibilité du marqueur (string)  
  *Options*: "private", "friends", "public"
- images: Entre 2 et 5 images (fichier)
- ratings: Objet JSON avec des labels et des valeurs (facultatif)
- comment: Commentaire (string, optionnel)

**Réponse Possible**:

```json
{
    "message": "Marker created successfully"
}
```

---

### 2. Obtenir tous les Marqueurs

**URL**: `https://map-point.netgraph.fr/api/marker/`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "Marqueur 1",
        "description": "Description du marqueur 1",
        "latitude": "48.8566",
        "longitude": "2.3522",
        "created_at": "2023-10-01"
    },
    ...
]
```

---

### 3. Mettre à jour un Marqueur

**URL**: `https://map-point.netgraph.fr/api/marker/update/:id`  
**Méthode**: PUT  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: multipart/form-data

**Corps** (FormData):
- title: Nouveau titre du marqueur (string)
- description: Nouvelle description du marqueur (string, optionnel)
- latitude: Nouvelle latitude du marqueur (string)
- longitude: Nouvelle longitude du marqueur (string)
- type: Nouveau type du marqueur (string)
- visibility: Nouvelle visibilité (string)
- images: Entre 2 et 5 nouvelles images (fichier, optionnel)
- ratings: Objet JSON avec des labels et des valeurs (facultatif)
- comment: Nouveau commentaire (string, optionnel)

**Réponse Possible**:

```json
{
    "message": "Marker updated successfully"
}
```

---

### 4. Obtenir les Marqueurs de l'Utilisateur Connecté

**URL**: `https://map-point.netgraph.fr/api/marker/user`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "Marqueur 1",
        "description": "Description du marqueur 1",
        "latitude": "48.8566",
        "longitude": "2.3522",
        "created_at": "2023-10-01"
    },
    ...
]
```

---

### 5. Obtenir les Marqueurs d'un Utilisateur par ID

**URL**: `https://map-point.netgraph.fr/api/marker/user/:userId`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
[
    {
        "id": 1,
        "title": "Marqueur 1",
        "description": "Description du marqueur 1",
        "latitude": "48.8566",
        "longitude": "2.3522",
        "created_at": "2023-10-01"
    },
    ...
]
```

---

### 6. Obtenir un Marqueur par ID

**URL**: `https://map-point.netgraph.fr/api/marker/:id`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "id": 1,
    "title": "Marqueur 1",
    "description": "Description du marqueur 1",
    "latitude": "48.8566",
    "longitude": "2.3522",
    "created_at": "2023-10-01"
}
```

---

### 7. Supprimer un Marqueur

**URL**: `https://map-point.netgraph.fr/api/marker/delete/:id`  
**Méthode**: DELETE  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "message": "Marker deleted successfully"
}
```

---

## Routes pour la Gestion des Labels

### 1. Ajouter des Labels à un Type de Marqueur

**URL**: `https://map-point.netgraph.fr/api/marker/addLabels`  
**Méthode**: POST  
**Headers**:  
- Authorization: Bearer `<token>`  
- Content-Type: application/json

**Corps**:

```json
{
    "markerType": "park",
    "labels": ["cleanliness", "beauty"]
}
```

**Réponse Possible**:

```json
{
    "message": "Labels added successfully"
}
```

---

### 2. Obtenir des Labels par Type de Marqueur

**URL**: `https://map-point.netgraph.fr/api/marker/labels/:markerType`  
**Méthode**: GET  
**Headers**:  
- Authorization: Bearer `<token>`

**Réponse Possible**:

```json
{
    "status": "success",
    "data": [
        {
            "label": "cleanliness"
        },
        {
            "label": "beauty"
        }
    ]
}
```

---

## Explications Générales

1. **Créer un Marqueur** : Cette route permet à un utilisateur de créer un nouveau marqueur en fournissant des informations telles que le titre, la description, la latitude, la longitude, le type, la visibilité et des images. Il est obligatoire de fournir entre 2 et 5 images, et la visibilité peut être définie comme privée, visible par les amis, ou publique.

2. **Obtenir tous les Marqueurs** : Cette route renvoie tous les marqueurs disponibles visibles par l'utilisateur connecté. Cela peut inclure des marqueurs publics ou privés, en fonction des paramètres de visibilité.

3. **Mettre à jour un Marqueur** : Un utilisateur peut mettre à jour les informations de l'un de ses marqueurs, en modifiant son titre, sa description, ses images, etc. Si l'utilisateur ne fournit pas certaines informations (par exemple les images), les données actuelles seront conservées.

4. **Obtenir les Marqueurs de l'Utilisateur Connecté** : Cette route renvoie tous les marqueurs créés par l'utilisateur connecté. Elle est utile pour permettre à l'utilisateur de gérer ses propres marqueurs.

5. **Obtenir les Marqueurs d'un Utilisateur par ID** : Cette route permet de voir les marqueurs d'un autre utilisateur spécifié par son ID, si ces marqueurs sont publics ou accessibles par l'utilisateur connecté en fonction des paramètres de visibilité.

6. **Supprimer un Marqueur** : Un utilisateur peut supprimer un de ses marqueurs en fournissant l'ID de celui-ci. Cette action est irréversible.

7. **Ajouter des Labels** : Permet d'ajouter plusieurs labels associés à un type de marqueur. Par exemple, un marqueur de type "park" pourrait avoir des labels comme "cleanliness" et "beauty".

8. **Obtenir des Labels** : Cette route permet d'obtenir les labels associés à un type spécifique de marqueur, comme "park", "restaurant", etc.

Chaque route nécessite un jeton JWT valide à passer dans le header d'autorisation pour authentifier l'utilisateur.