import json
import requests
from io import BytesIO

from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F

from torchvision import transforms
from torchvision.models import efficientnet_b0


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# -------------------------
# Load Classes
# -------------------------
with open("classes.json", "r") as f:
    CLASSES = json.load(f)


# -------------------------
# Load EfficientNet Model
# -------------------------
model = None

def get_classifier():
    global model

    if model is None:

        model = efficientnet_b0(weights=None)

        num_features = model.classifier[1].in_features

        model.classifier[1] = nn.Linear(
            num_features,
            len(CLASSES)
        )

        model.load_state_dict(
            torch.load(
                "emstrap_best.pth",
                map_location=device
            )
        )

        model.to(device)
        model.eval()

    return model


# -------------------------
# Image Transform
# -------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])


def classify_image_from_url(image_url):

    response = requests.get(image_url)
    response.raise_for_status()

    image = Image.open(
        BytesIO(response.content)
    ).convert("RGB")

    image_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():

        model = get_classifier()

        outputs = model(image_tensor)

        probabilities = F.softmax(outputs, dim=1)[0]

        confidence, predicted_idx = torch.max(
            probabilities,
            0
        )

    predicted_class = CLASSES[predicted_idx.item()]

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("Raw probabilities:", probabilities.tolist())
    print("Predicted class:", predicted_class)
    print("Confidence:", float(confidence.item()))
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    confidence = float(confidence.item())

    all_probabilities = {}

    for i, cls in enumerate(CLASSES):
        all_probabilities[cls] = float(
            probabilities[i].item()
        )

    return {

        "predicted_class": predicted_class,

        "confidence": confidence,

        "all_probabilities": all_probabilities

    }